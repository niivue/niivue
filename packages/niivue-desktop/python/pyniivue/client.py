"""Synchronous WebSocket client for controlling NiiVue Desktop."""

import json
import os
import base64
from pathlib import Path

import websocket


def _read_port_file():
    """Read the WebSocket port from ~/.niivue/ws-port."""
    port_file = Path.home() / '.niivue' / 'ws-port'
    if not port_file.exists():
        raise ConnectionError(
            'NiiVue Desktop does not appear to be running '
            f'(no port file at {port_file}). '
            'Start NiiVue Desktop GUI first.'
        )
    return int(port_file.read_text().strip())


def connect(host='127.0.0.1', port=None):
    """Create and return a connected NiiVueClient.

    Args:
        host: WebSocket host (default: 127.0.0.1)
        port: WebSocket port (default: auto-discover from ~/.niivue/ws-port)

    Returns:
        NiiVueClient instance (use as context manager)
    """
    if port is None:
        port = _read_port_file()
    client = NiiVueClient(host, port)
    client.open()
    return client


class NiiVueClient:
    """Synchronous client for NiiVue Desktop WebSocket API.

    Usage::

        with pyniivue.connect() as nv:
            nv.load_volume('/path/to/brain.nii.gz')
            nv.set_colormap(0, 'viridis')
            nv.screenshot('/tmp/out.png')
    """

    def __init__(self, host='127.0.0.1', port=None):
        self._host = host
        self._port = port
        self._ws = None
        self._request_id = 0

    def open(self):
        """Open the WebSocket connection."""
        if self._port is None:
            self._port = _read_port_file()
        url = f'ws://{self._host}:{self._port}'
        self._ws = websocket.create_connection(url)

    def close(self):
        """Close the WebSocket connection."""
        if self._ws:
            self._ws.close()
            self._ws = None

    def __enter__(self):
        if self._ws is None:
            self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

    def _call(self, method, params=None):
        """Send a JSON-RPC 2.0 request and return the result."""
        if self._ws is None:
            raise ConnectionError('Not connected. Call open() first or use as context manager.')
        self._request_id += 1
        request = {
            'jsonrpc': '2.0',
            'id': self._request_id,
            'method': method,
        }
        if params:
            request['params'] = params
        self._ws.send(json.dumps(request))
        raw = self._ws.recv()
        response = json.loads(raw)
        if 'error' in response and response['error']:
            err = response['error']
            raise RuntimeError(f"NiiVue error ({err.get('code', -1)}): {err.get('message', 'Unknown error')}")
        return response.get('result')

    # --- Volume operations ---

    def load_volume(self, path):
        """Load a NIfTI volume from a file path.

        Args:
            path: Absolute path to a NIfTI file (.nii, .nii.gz, etc.)

        Returns:
            dict with 'index' and 'id' of the loaded volume
        """
        return self._call('loadVolume', {'path': str(Path(path).resolve())})

    def remove_volume(self, index):
        """Remove a volume by index.

        Args:
            index: Volume index (0 = background)
        """
        self._call('removeVolume', {'index': index})

    def get_volumes(self):
        """Get info about all loaded volumes.

        Returns:
            list of dicts with keys: index, id, name, colormap, opacity, dims
        """
        return self._call('getVolumes')

    def set_colormap(self, volume_index, colormap):
        """Change the colormap for a volume.

        Args:
            volume_index: Volume index
            colormap: Colormap name (e.g., 'gray', 'viridis', 'hot')
        """
        self._call('setColormap', {'volumeIndex': volume_index, 'colormap': colormap})

    def set_opacity(self, volume_index, opacity):
        """Set opacity for a volume.

        Args:
            volume_index: Volume index
            opacity: Opacity value (0.0 to 1.0)
        """
        self._call('setOpacity', {'volumeIndex': volume_index, 'opacity': opacity})

    # --- Scene operations ---

    def set_slice_type(self, slice_type):
        """Set the slice view type.

        Args:
            slice_type: 0=axial, 1=coronal, 2=sagittal, 3=multiplanar, 4=render
        """
        self._call('setSliceType', {'sliceType': slice_type})

    def set_clip_plane(self, depth_azimuth_elevation):
        """Set the clip plane for 3D rendering.

        Args:
            depth_azimuth_elevation: list of [depth, azimuth, elevation]
        """
        self._call('setClipPlane', {'depthAzimuthElevation': depth_azimuth_elevation})

    def set_render_azimuth_elevation(self, azimuth, elevation):
        """Set the 3D render orientation.

        Args:
            azimuth: Azimuth angle in degrees
            elevation: Elevation angle in degrees
        """
        self._call('setRenderAzimuthElevation', {'azimuth': azimuth, 'elevation': elevation})

    def set_crosshair_width(self, width):
        """Set crosshair width.

        Args:
            width: Crosshair width (0 = hidden)
        """
        self._call('setCrosshairWidth', {'width': width})

    # --- Mesh operations ---

    def load_mesh(self, path):
        """Load a mesh from a file path.

        Args:
            path: Absolute path to a mesh file (.gii, .stl, .obj, etc.)

        Returns:
            dict with 'index' of the loaded mesh
        """
        return self._call('loadMesh', {'path': str(Path(path).resolve())})

    def remove_mesh(self, index):
        """Remove a mesh by index.

        Args:
            index: Mesh index
        """
        self._call('removeMesh', {'index': index})

    # --- Screenshot and save ---

    def screenshot(self, output_path=None):
        """Take a screenshot of the current view.

        Args:
            output_path: If provided, save PNG to this path.
                         If None, return base64-encoded PNG data.

        Returns:
            None if output_path is given, otherwise dict with 'base64' key
        """
        params = {}
        if output_path:
            params['outputPath'] = str(Path(output_path).resolve())
        return self._call('screenshot', params)

    def save_volume(self, volume_index, output_path):
        """Save a volume to a NIfTI file.

        Args:
            volume_index: Volume index to save
            output_path: Output file path (.nii or .nii.gz)
        """
        self._call('saveVolume', {
            'volumeIndex': volume_index,
            'outputPath': str(Path(output_path).resolve())
        })

    # --- Info ---

    def get_colormaps(self):
        """Get list of available colormap names.

        Returns:
            list of colormap name strings
        """
        return self._call('getColormaps')

    def get_scene(self):
        """Get current scene information.

        Returns:
            dict with keys: volumes, meshCount, sliceType, crosshairWidth
        """
        return self._call('getScene')
