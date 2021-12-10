#include "core.h"
#define _USE_MATH_DEFINES //microsoft compiler
#include <float.h>		  //FLT_EPSILON
#include <limits.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#ifdef __aarch64__
	#include "arm_malloc.h"
#else
	#include <immintrin.h>
#endif

#ifdef USING_WASM
#define WASM_EXPORT(name) \
  __attribute__((export_name(#name))) \
  name

// Pull these in from walloc.c.
                          
void* WASM_EXPORT(walloc)(size_t size) {
  return xmalloc(size);
}

void WASM_EXPORT(wfree)(void* ptr) {
  xfree(ptr);
}

	void xmemcpy ( void * destination, const void * source, size_t num ) {
		uint8_t * s = (uint8_t*) source;
		uint8_t * d = (uint8_t*) destination;
		for (size_t i = 0; i < num; i++)
			d[i] = s[i];
	}
	#define staticx
	#include <nifti2_wasm.h>
#else
	#define xmemcpy memcpy
	#include <nifti2_io.h>
#endif

#ifndef M_PI
#define M_PI 3.14159265358979323846264338327
#endif

int nii_otsu(int* H, int nBin, int mode) {
//H: Histogram H[0..nBin-1] with each bin storing nuumber of pixels of this brightness
//nBin: number of bins in histogram, e.g. 256 for H[0..255]
//mode: threshold 
	double Sum = 0.0;
	for (int v = 0; v < nBin; v++)
		Sum = Sum + H[v];
	if (Sum <= 0)
		return 0;
	double P[nBin][nBin], S[nBin][nBin];
	P[0][0] = H[0];
	S[0][0] = H[0];
	for (int v = 1; v < nBin; v++) {
		double Prob = H[v]/Sum;
		P[0][v] = P[0][v-1]+Prob;
		S[0][v] = S[0][v-1]+(v+1)*Prob;
	}
	for (int u = 1; u < nBin; u++) {
		for (int v = u; v < nBin; v++) {
			P[u][v] = P[0][v]-P[0][u-1];
			S[u][v] = S[0][v]-S[0][u-1];
		}
	}
	//result is eq 29 from Liao
	for (int u = 0; u < nBin; u++) {
		for (int v = u; v < nBin; v++) {
			if (P[u][v] != 0) //avoid divide by zero errors...
				P[u][v] = sqr(S[u][v]) / P[u][v];
		}
	}
	int thresh = 0;
	if ((mode == 1) || (mode == 5)) {
		int lo = (int)(0.25*nBin);
		int mi = (int)(0.50*nBin);
		int hi = (int)(0.75*nBin);
		//double max = P[0][lo] + P[lo+1][hi] + P[hi+1][nBin-1];
		double max = P[0][lo] + P[lo+1][mi] + P[mi+1][hi] + P[hi+1][255];
		for (int l = 0; l < (nBin-3); l++) {
			for (int m = l + 1; m < (nBin-2); m++) {
				for (int h = m + 1; h < (nBin-1); h++) {
					//double v = P[0][l]+P[l+1][h]+P[h+1][nBin-1];
					double v = P[0][l] + P[l+1][m] + P[m+1][h] + P[h+1][255];
					if (v > max) {
						lo = l;
						mi = m;
						hi = h;
						max = v;
					} //new max
				}//for h -> hi
			} //for m -> mi
		} //for l -> low
		//printf(">>>>%d %d %d\n", lo, mi, hi);
		if (mode == 1)
			thresh = hi;
		else
			thresh = lo;
	} else if ((mode == 2) || (mode == 4)) {
		int lo = (int)(0.33*nBin);
		int hi = (int)(0.67*nBin);
		double max = P[0][lo] + P[lo+1][hi] + P[hi+1][nBin-1];
		for (int l = 0; l < (nBin-2); l++) {
			for (int h = l + 1; h < (nBin-1); h++) {
				double v = P[0][l]+P[l+1][h]+P[h+1][nBin-1];
				if (v > max) {
					lo = l;
					hi = h;
					max = v;
				} //new max
			}//for h -> hi
		} //for l -> low
		//printf(">>>>%d %d\n", lo, hi);
		if (mode == 1)
			thresh = hi;
		else
			thresh = lo;
	} else {
		thresh = (int)(0.25*nBin); //nBin / 2;
		double max = P[0][thresh]+P[thresh+1][nBin-1];
		//exhaustively search
		for (int i = 0; i < (nBin-1); i++) {
			double v = P[0][i]+P[i+1][nBin-1];
			if (v > max) {
				thresh = i;
				max = v;
			}//new max
		}
	}
	//printf(">>>>%d\n", thresh);	
	return thresh;
}

#ifndef USING_WASM
int nifti_save(nifti_image *nim, const char *postfix) {
	char extnii[5] = ".nii"; /* modifiable, for possible uppercase */
	char exthdr[5] = ".hdr";
	char extimg[5] = ".img";
	char extgz[5] = ".gz";
	//e.g if current filename is img.nii and postfix is "_FA", save file "img_FA.nii"
	char *fname_in = nim->fname;
	char *iname_in = nim->iname;
	int nifti_type_in = nim->nifti_type;
	char *hname = (char *)calloc(sizeof(char), strlen(nim->fname) + strlen(postfix) + 8);
	char *iname = (char *)calloc(sizeof(char), strlen(nim->fname) + strlen(postfix) + 8);
	//char * hext = (char *)calloc(sizeof(char),8);
	//char * iext = (char *)calloc(sizeof(char),8);
	const char *ext; //input extension
	ext = nifti_find_file_extension(nim->fname);
	strcpy(hname, nim->fname);
	hname[strlen(hname) - strlen(ext)] = 0;
	strcat(hname, postfix);
	strcpy(iname, hname);
	//default extension: .nii
	//strcpy(hext, extnii);
	//strcpy(iext, extnii);
	//read environment
	//export FSLOUTPUTTYPE=NIFTI
	const char *key = "FSLOUTPUTTYPE";
	char nii2Key[2] = "2";
	char gzKey[3] = "GZ";
	char pairKey[5] = "PAIR";
	char *value;
	value = getenv(key);
	//n* has precedence, resolve conflicts between ->dim[*] and ->n*
	nim->dim[1] = nim->nx; //e.g. crop, subsamp2offc
	nim->dim[2] = nim->ny; //e.g. subsamp2offc
	nim->dim[3] = nim->nz; //e.g. subsamp2offc
	nim->dim[4] = nim->nt; //e.g. 4D -> 3D operations like mean
	nim->dim[5] = nim->nu;
	nim->dim[6] = nim->nv;
	nim->dim[7] = nim->nw;
	//d* has precedence, resolve conflicts between ->pixdim[*] and d*
	nim->pixdim[1] = nim->dx;
	nim->pixdim[2] = nim->dy;
	nim->pixdim[3] = nim->dz;
	nim->pixdim[4] = nim->dt;
	//set dime[0]
	int maxDim = 1;
	for (int i = 2; i < 8; i++)
		if (nim->dim[i] > 1)
			maxDim = i;
	nim->dim[0] = maxDim;
	nim->ndim = maxDim;
	//nim->dim[0] = 3;
	//nim->dim[4] = 1;
	int isGz = 0;
	int isNifti2 = 0;
	if ((value != NULL) && strstr(value, nii2Key))
		isNifti2 = 1; //NIFTI2_GZ, NIFTI2_PAIR_GZ, NIFTI_GZ, NIFTI_PAIR_GZ
#ifdef HAVE_ZLIB // if compression is requested, make sure of suffix
	if ((value == NULL) || strstr(value, gzKey))
		isGz = 1; //NIFTI2_GZ, NIFTI2_PAIR_GZ, NIFTI_GZ, NIFTI_PAIR_GZ
#endif
	if ((value != NULL) && strstr(value, pairKey)) {
		strcat(hname, exthdr);
		strcat(iname, extimg);
		if (isNifti2)
			nim->nifti_type = NIFTI_FTYPE_NIFTI2_2;
		else
			nim->nifti_type = NIFTI_FTYPE_NIFTI1_2;

		if (isGz)
			strcat(iname, extgz);
	} else {
		strcat(hname, extnii);
		strcat(iname, extnii);
		if (isNifti2)
			nim->nifti_type = NIFTI_FTYPE_NIFTI2_1;
		else
			nim->nifti_type = NIFTI_FTYPE_NIFTI1_1;
		if (isGz) {
			strcat(hname, extgz);
			strcat(iname, extgz);
		}
	}
	//append extensions...
	nim->fname = hname;
	nim->iname = iname;
	nifti_image_write(nim);
	free(hname);
	if (nim->iname != NULL)
		free(iname);
	//return to input names
	nim->fname = fname_in;
	nim->iname = iname_in;
	nim->nifti_type = nifti_type_in;
	return 0;
}

mat44 xform(nifti_image *nim) {
	if ((nim->sform_code == NIFTI_XFORM_UNKNOWN) && (nim->qform_code == NIFTI_XFORM_UNKNOWN)) {
		mat44 m; //4x4 matrix includes translations
		LOAD_MAT44(m, nim->dx, 0.0, 0.0, 0.0, 0.0, nim->dy, 0.0, 0.0, 0.0, 0.0, nim->dz, 0.0);
		return m;
	}
	nifti_dmat44 AA = nim->sto_xyz;
	if (nim->sform_code < nim->qform_code) //give precedence to SForm, like SPM but unlike VTK tools like ANTs
		AA = nim->qto_xyz; //note qform more constrained than sform: quaternions can not store shears, matrices can
	mat44 m; //4x4 matrix includes translations
	LOAD_MAT44(m, AA.m[0][0], AA.m[0][1], AA.m[0][2], AA.m[0][3],
		AA.m[1][0], AA.m[1][1], AA.m[1][2], AA.m[1][3],
		AA.m[2][0], AA.m[2][1], AA.m[2][2], AA.m[2][3]);
	return m;
}

int neg_determ(nifti_image *nim) {
	//returns -1 for negative determinant, +1 for positive
	mat44 AA = xform(nim);
	mat33 m;
	LOAD_MAT33(m, AA.m[0][0], AA.m[0][1], AA.m[0][2], AA.m[1][0], AA.m[1][1], AA.m[1][2], AA.m[2][0], AA.m[2][1], AA.m[2][2]);
	//printf("determ = %g\n", nifti_mat33_determ(m));
	if (nifti_mat33_determ(m) < 0)
		return 1;
	return 0;
} //report if negative determinant, e.g. we don't want negative volume, eg. "brain volume of -1400cc"

nifti_image *nifti_image_read2(const char *hname, int read_data) {
	//in fslmaths 6.0.1 the commands are different, the first preserves cal_min, cal_max
	// fslmaths in out
	// fslmaths in -add 0 out -odt input
	nifti_image *nim = nifti_image_read(hname, read_data);
	if (nim == NULL)
		exit(134);
	nim->cal_min = 0.0;
	nim->cal_max = 0.0;
	//nim->descrip = '';
	char blank_string[128];
	memset(&blank_string[0], 0, sizeof(blank_string));
	memcpy(nim->descrip, blank_string, 79);
	nim->descrip[79] = '\0';
	strcat(nim->descrip, "6.0.5"); //target fslmaths version
	memcpy(nim->aux_file, blank_string, 23);
	nim->aux_file[23] = '\0';
	memcpy(nim->intent_name, blank_string, 15);
	nim->intent_name[15] = '\0';
	return nim;
}
#endif //not USING_WASM
vec4 setVec4(float x, float y, float z) {
	vec4 v = {{x, y, z, 1}};
	return v;
}

vec4 nifti_vect44mat44_mul(vec4 v, mat44 m) { //multiply vector * 4x4matrix
	vec4 vO;
	for (int i = 0; i < 4; i++) { //multiply Pcrs * m
		vO.v[i] = 0;
		for (int j = 0; j < 4; j++)
			vO.v[i] += m.m[i][j] * v.v[j];
	}
	return vO;
}

float vertexDisplacement(float x, float y, float z, mat44 m, mat44 m2) {
	//distance between position of voxel [x,y,z] in space m versus space m2
	vec4 vx = setVec4(x, y, z);
	vec4 pos = nifti_vect44mat44_mul(vx, m);
	vec4 pos2 = nifti_vect44mat44_mul(vx, m2);
	return sqrt(sqr(pos.v[0] - pos2.v[0]));
}

#ifndef USING_WASM
float max_displacement_mm(nifti_image *nim, nifti_image *nim2) {
	//examines each corner of two NIfTI images and returns the max difference in vertex location
	// used to detect if two volumes are aligned
	mat44 m = xform(nim);	//4x4 matrix includes translations
	mat44 m2 = xform(nim2); //4x4 matrix includes translations
	float mx = vertexDisplacement(0, 0, 0, m, m2);
	mx = MAX(mx, vertexDisplacement(nim->nx - 1, 0, 0, m, m2));
	mx = MAX(mx, vertexDisplacement(nim->nx - 1, nim->ny - 1, 0, m, m2));
	mx = MAX(mx, vertexDisplacement(nim->nx - 1, nim->ny - 1, nim->nz - 1, m, m2));
	mx = MAX(mx, vertexDisplacement(nim->nx - 1, 0, nim->nz - 1, m, m2));
	mx = MAX(mx, vertexDisplacement(0, nim->ny - 1, 0, m, m2));
	mx = MAX(mx, vertexDisplacement(0, nim->ny - 1, nim->nz - 1, m, m2));
	mx = MAX(mx, vertexDisplacement(0, 0, nim->nz - 1, m, m2));
	return mx;
}
#endif

in_hdr set_input_hdr(nifti_image *nim) {
	//remember input datatype, slope and intercept in case user saves back to this
	in_hdr ihdr;
	ihdr.datatype = nim->datatype;
	ihdr.scl_slope = nim->scl_slope;
	ihdr.scl_inter = nim->scl_inter;
	return ihdr;
}

#ifndef USING_WASM
int nifti_image_change_datatype(nifti_image *nim, int dt, in_hdr *ihdr) {
	//returns -1 on failure, 0 if okay
	if (nim->datatype == dt)
		return 0; //no change!
	if (nim->nvox < 1)
		return -12;
	if (nim->scl_slope == 0.0f)
		nim->scl_slope = 1.0;
	float scl = nim->scl_slope;
	float inter = nim->scl_inter;
	if (ihdr->datatype == dt) { //saving BACK to original format, e.g. int16 converted to float32 for calculations and saved back to int16
		nim->scl_slope = ihdr->scl_slope;
		nim->scl_inter = ihdr->scl_inter;
	} else {
		nim->scl_slope = 1.0f;
		nim->scl_inter = 0.0f;
	}
	int idt = nim->datatype; //input datatype
	double *f64 = (double *)nim->data;
	float *f32 = (float *)nim->data;
	uint32_t *u32 = (uint32_t *)nim->data;
	int32_t *i32 = (int32_t *)nim->data;
	uint16_t *u16 = (uint16_t *)nim->data;
	int16_t *i16 = (int16_t *)nim->data;
	uint8_t *u8 = (uint8_t *)nim->data;
	int8_t *i8 = (int8_t *)nim->data;
	int ok = -1;
	if (dt == DT_FLOAT64) {
		nim->datatype = DT_FLOAT64;
		nim->nbyper = 8;
		void *dat = (void *)calloc(1, nim->nvox * sizeof(double));
		double *o64 = (double *)dat;
		if (idt == DT_FLOAT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (u32[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (u32[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_INT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (i32[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (u16[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_INT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (i16[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (u8[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o64[i] = (i8[i] * scl) + inter;
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_FLOAT64
	if (dt == DT_FLOAT32) {
		float *o32 = (float *)nim->data;
		nim->datatype = DT_FLOAT32;
		nim->nbyper = 4;
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (u32[i] * scl) + inter;
			return 0;
		}
		if (idt == DT_INT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (i32[i] * scl) + inter;
			return 0;
		}
		//following change nbyper
		void *dat = (void *)calloc(1, nim->nvox * sizeof(float));
		o32 = (float *)dat;
		if (idt == DT_FLOAT64) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (f64[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (u16[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_INT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (i16[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (u8[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = (i8[i] * scl) + inter;
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_FLOAT32)
	if (dt == DT_INT32) {
		int32_t *o32 = (int32_t *)nim->data;
		nim->datatype = DT_INT32;
		nim->nbyper = 4;
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((u32[i] * scl) + inter);
			return 0;
		}
		if (idt == DT_FLOAT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((f32[i] * scl) + inter);
			return 0;
		}
		//following change nbyper
		void *dat = (void *)calloc(1, nim->nvox * sizeof(int32_t));
		o32 = (int32_t *)dat;
		if (idt == DT_FLOAT64) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round(f64[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((u16[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_INT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((i16[i] * scl) + inter);
			free(nim->data);
			nim->data = dat;
			ok = 0;
		}
		if (idt == DT_UINT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((u8[i] * scl) + inter);
			free(nim->data);
			nim->data = dat;
			ok = 0;
		}
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o32[i] = round((i8[i] * scl) + inter);
			free(nim->data);
			nim->data = dat;
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_INT32)
	if (dt == DT_INT16) {
		int16_t *o16 = (int16_t *)nim->data;
		nim->datatype = DT_INT16;
		nim->nbyper = 2;
		if (idt == DT_UINT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((u16[i] * scl) + inter);
			return 0;
		}
		//following change nbyper
		void *dat = (void *)calloc(1, nim->nvox * sizeof(int16_t));
		o16 = (int16_t *)dat;
		if (idt == DT_FLOAT64) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round(f64[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((u32[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_FLOAT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((f32[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_UINT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((u8[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((i8[i] * scl) + inter);
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_INT16)
	if (dt == DT_UINT16) {
		uint16_t *o16 = (uint16_t *)nim->data;
		nim->datatype = DT_UINT16;
		nim->nbyper = 2;
		if (idt == DT_INT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((i16[i] * scl) + inter);
			return 0;
		}
		//following change nbyper
		void *dat = (void *)calloc(1, nim->nvox * sizeof(int16_t));
		o16 = (uint16_t *)dat;
		if (idt == DT_FLOAT64) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round(f64[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((u32[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_FLOAT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((f32[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_UINT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((u8[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o16[i] = round((i8[i] * scl) + inter);
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_UINT16)
	if (dt == DT_UINT8) {
		uint8_t *o8 = (uint8_t *)nim->data;
		nim->datatype = DT_UINT8;
		nim->nbyper = 1;
		if (idt == DT_INT8) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round((i8[i] * scl) + inter);
			return 0;
		}
		//following change nbyper
		void *dat = (void *)calloc(1, nim->nvox * sizeof(uint8_t));
		o8 = (uint8_t *)dat;
		if (idt == DT_FLOAT64) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round(f64[i] * scl) + inter;
			ok = 0;
		}
		if (idt == DT_UINT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round((u16[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_INT16) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round((i16[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_UINT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round((u32[i] * scl) + inter);
			ok = 0;
		}
		if (idt == DT_FLOAT32) {
			for (size_t i = 0; i < nim->nvox; i++)
				o8[i] = round((f32[i] * scl) + inter);
			ok = 0;
		}
		if (ok == 0) {
			free(nim->data);
			nim->data = dat;
			return 0;
		}
		free(dat);
	} //if (dt == DT_UINT16)
	printfx("nifti_image_change_datatype: Unsupported datatype %d -> %d\n", idt, dt);
	return ok;
} //nifti_image_change_datatype()

int *make_kernel_file(nifti_image *nim, int *nkernel, char *fin) {
	nifti_image *nim2 = nifti_image_read(fin, 1);
	if (!nim2) {
		printfx("make_kernel_file: failed to read NIfTI image '%s'\n", fin);
		return NULL;
	}
	int x = nim2->nx;
	int y = nim2->ny;
	int z = nim2->nz;
	int xlo = (int)(-x / 2);
	int ylo = (int)(-y / 2);
	int zlo = (int)(-z / 2);
	in_hdr ihdr = set_input_hdr(nim2);
	if (nifti_image_change_datatype(nim2, DT_FLOAT32, &ihdr) != 0) {
		nifti_image_free(nim2);
		return NULL;
	}
	int n = 0;
	float *f32 = (float *)nim2->data;
	double sum = 0.0;
	for (int i = 0; i < nim2->nvox; i++) {
		if (f32[i] == 0)
			continue;
		sum += fabs(f32[i]);
		n++;
	}
	if ((sum == 0.0) || (n == 0))
		return NULL;
	*nkernel = n;
	int *kernel = (int *)_mm_malloc((n * 4) * sizeof(int), 64); //4 values: offset, xpos, ypos, weight
	//for evenly weighted voxels:
	//int kernelWeight = (int)((double)INT_MAX/(double)n); //requires <limits.h>
	double kernelWeight = (double)INT_MAX / sum;
	int vx = -1;
	int i = 0;
	for (int zi = zlo; zi < (zlo + z); zi++)
		for (int yi = ylo; yi < (ylo + y); yi++)
			for (int xi = xlo; xi < (xlo + x); xi++) {
				vx++;
				if (f32[vx] == 0)
					continue;
				kernel[i] = xi + (yi * nim->nx) + (zi * nim->nx * nim->ny);
				kernel[i + n] = xi; //left-right wrap detection
				kernel[i + n + n] = yi; //anterior-posterior wrap detection
				kernel[i + n + n + n] = (int)(kernelWeight * f32[vx]); //kernel height (weight)
				i++;
			}
	nifti_image_free(nim2);
	return kernel;
} //make_kernel_file()
#endif //not USING_WASM

int *make_kernel_sphere(nifti_image *nim, int *nkernel, double mm) {
	// sphere of radius <size> mm centered on target voxel
	mm = fabs(mm);
	if (mm == 0.0)
		return NULL;
	int x = (2 * floor(mm / nim->dx)) + 1;
	int y = (2 * floor(mm / nim->dy)) + 1;
	int z = (2 * floor(mm / nim->dz)) + 1;
	int xlo = (int)(-x / 2);
	int ylo = (int)(-y / 2);
	int zlo = (int)(-z / 2);
	//first pass: determine number of surviving voxels (n)
	int n = 0;
	for (int zi = zlo; zi < (zlo + z); zi++)
		for (int yi = ylo; yi < (ylo + y); yi++)
			for (int xi = xlo; xi < (xlo + x); xi++) {
				float dx = (xi * nim->dx);
				float dy = (yi * nim->dy);
				float dz = (zi * nim->dz);
				float dist = sqrt(dx * dx + dy * dy + dz * dz);
				if (dist > mm)
					continue;
				n++;
			}
	*nkernel = n;
	int *kernel = (int *)_mm_malloc((n * 4) * sizeof(int), 64); //4 values: offset, xpos, ypos, weight
	int kernelWeight = (int)((double)INT_MAX / (double)n);		//requires <limits.h>
	//second pass: fill surviving voxels
	int i = 0;
	for (int zi = zlo; zi < (zlo + z); zi++)
		for (int yi = ylo; yi < (ylo + y); yi++)
			for (int xi = xlo; xi < (xlo + x); xi++) {
				float dx = (xi * nim->dx);
				float dy = (yi * nim->dy);
				float dz = (zi * nim->dz);
				float dist = sqrt(dx * dx + dy * dy + dz * dz);
				if (dist > mm)
					continue;
				kernel[i] = xi + (yi * nim->nx) + (zi * nim->nx * nim->ny);
				kernel[i + n] = xi; //left-right wrap detection
				kernel[i + n + n] = yi; //anterior-posterior wrap detection
				kernel[i + n + n + n] = kernelWeight; //kernel height
				i++;
			}
	return kernel;
}

int *make_kernel(nifti_image *nim, int *nkernel, int x, int y, int z) {
	//returns voxels in kernel
	x = MAX(1, x);
	y = MAX(1, y);
	z = MAX(1, z);
	if (((x % 2) == 0) || ((y % 2) == 0) || ((z % 2) == 0))
		printfx("Off-center kernel due to even dimensions.\n");
	int n = x * y * z;
	*nkernel = n;
	int *kernel = (int *)_mm_malloc((n * 4) * sizeof(int), 64); //4 values: offset, xpos, ypos, weight
	int xlo = (int)(-x / 2);
	int ylo = (int)(-y / 2);
	int zlo = (int)(-z / 2);
	int i = 0;
	int kernelWeight = (int)((double)INT_MAX / (double)n); //requires <limits.h>
	for (int zi = zlo; zi < (zlo + z); zi++)
		for (int yi = ylo; yi < (ylo + y); yi++)
			for (int xi = xlo; xi < (xlo + x); xi++) {
				//printf("%d %d %d\n", xi,yi,zi);
				kernel[i] = xi + (yi * nim->nx) + (zi * nim->nx * nim->ny);
				kernel[i + n] = xi; //left-right wrap detection
				kernel[i + n + n] = yi; //anterior-posterior wrap detection
				kernel[i + n + n + n] = kernelWeight; //kernel height
				i++;
			}
	return kernel;
}

//box filter, aka nearest neighbor
#define box_support (0.5)
static double box_filter(double t) {
	if ((t > -0.5) && (t <= 0.5))
		return (1.0);
	return (0.0);
}

//triangle filter, aka linear
#define triangle_support (1.0)
static double triangle_filter(double t) {
	if (t < 0.0)
		t = -t;
	if (t < 1.0)
		return (1.0 - t);
	return (0.0);
}

#define B_spline_support (2.0)
static double B_spline_filter(double t) {
	double tt;
	if (t < 0)
		t = -t;
	if (t < 1) {
		tt = t * t;
		return ((.5 * tt * t) - tt + (2.0 / 3.0));
	} else if (t < 2) {
		t = 2 - t;
		return ((1.0 / 6.0) * (t * t * t));
	}
	return (0.0);
}

static double sinc(double x) {
	x *= M_PI;
	if (x != 0)
		return (sin(x) / x);
	return (1.0);
}

#define Lanczos3_support (3.0)
static double Lanczos3_filter(double t) {
	if (t < 0)
		t = -t;
	if (t < 3.0)
		return (sinc(t) * sinc(t / 3.0));
	return (0.0);
}

#define Mitchell_support (2.0)
#define B (1.0 / 3.0)
#define C (1.0 / 3.0)
static double Mitchell_filter(double t) {
	double tt;
	tt = t * t;
	if (t < 0)
		t = -t;
	if (t < 1.0) {
		t = (((12.0 - 9.0 * B - 6.0 * C) * (t * tt)) + ((-18.0 + 12.0 * B + 6.0 * C) * tt) + (6.0 - 2 * B));
		return (t / 6.0);
	} else if (t < 2.0) {
		t = (((-1.0 * B - 6.0 * C) * (t * tt)) + ((6.0 * B + 30.0 * C) * tt) + ((-12.0 * B - 48.0 * C) * t) + (8.0 * B + 24 * C));
		return (t / 6.0);
	}
	return (0.0);
}

static double filter(double t) {
	/* f(t) = 2|t|^3 - 3|t|^2 + 1, -1 <= t <= 1 */
	if (t < 0.0)
		t = -t;
	if (t < 1.0)
		return ((2.0 * t - 3.0) * t * t + 1.0);
	return (0.0);
}

CLIST *createFilter(int srcXsize, int dstXsize, int filterMethod) {
	//CLIST	* createFilter(int srcXsize, int dstXsize, double (*filterf)(), double fwidth) {
	double (*filterf)() = filter;
	double fwidth;
	if (filterMethod == 0) {
		filterf = box_filter;
		fwidth = box_support;
	} else if (filterMethod == 2) {
		filterf = B_spline_filter;
		fwidth = B_spline_support;
	} else if (filterMethod == 3) {
		filterf = Lanczos3_filter;
		fwidth = Lanczos3_support;
	} else if (filterMethod == 4) {
		filterf = Mitchell_filter;
		fwidth = Mitchell_support;
	} else { //method 1 is the default: linear
		filterf = triangle_filter;
		fwidth = triangle_support;
	}
	CLIST *contrib = (CLIST *)calloc(dstXsize, sizeof(CLIST));
	double xscale = (double)dstXsize / (double)srcXsize;
	double width, fscale, weight;
	double center, left, right;
	int i, j, k, n;
	if (xscale < 1.0) { //image reduction requires anti-aliasing
		width = fwidth / xscale;
		fscale = 1.0 / xscale;
		for (i = 0; i < dstXsize; ++i) {
			contrib[i].n = 0;
			contrib[i].p = (CONTRIB *)calloc((int)(width * 2 + 1), sizeof(CONTRIB));
			center = (double)i / xscale;
			left = ceil(center - width);
			right = floor(center + width);
			for (j = (int)left; j <= (int)right; ++j) {
				weight = center - (double)j;
				weight = (*filterf)(weight / fscale) / fscale;
				if (j < 0) {
					n = -j;
				} else if (j >= srcXsize) {
					n = (srcXsize - j) + srcXsize - 1;
				} else {
					n = j;
				}
				k = contrib[i].n++;
				contrib[i].p[k].pixel = n;
				contrib[i].p[k].weight = weight;
			}
		}
	} else { //if shrink else zoom
		for (i = 0; i < dstXsize; ++i) {
			contrib[i].n = 0;
			contrib[i].p = (CONTRIB *)calloc((int)(fwidth * 2 + 1),
											 sizeof(CONTRIB));
			center = (double)i / xscale;
			left = ceil(center - fwidth);
			right = floor(center + fwidth);
			for (j = (int)left; j <= (int)right; ++j) {
				weight = center - (double)j;
				weight = (*filterf)(weight);
				if (j < 0)
					n = -j;
				else if (j >= srcXsize)
					n = (srcXsize - j) + srcXsize - 1;
				else
					n = j;
				k = contrib[i].n++;
				contrib[i].p[k].pixel = n;
				contrib[i].p[k].weight = weight;
			}
		}
	} //if shrink else zoom
	return contrib;
} //createFilter()

//https://raw.githubusercontent.com/afni/afni/b6a9f7a21c1f3231ff09efbd861f8975ad48e525/src/mri_stats.c
/*******************************************************************/
/****    Given p, return x such that Q(x)=p, for 0 < p < 1.     ****/
/****    Q(x) = 1-P(x) = reversed cdf of N(0,1) variable.       ****/
/*******************************************************************/
//qg and qginv are from AFNI, early AFNI code is GPL later is public domain
//  these are likely early routines, but generic formula
//  if one wants to remove GPL, this should be investigated more carefully

double qg(double x) { return 0.5 * erfc(x / 1.414213562373095); }

double qginv(double p) {
	double dp, dx, dt, ddq, dq;
	int newt; /* not Gingrich, but Isaac */

	dp = (p <= 0.5) ? (p) : (1.0 - p); /* make between 0 and 0.5 */

	if (dp <= 6.1172e-39) { /* cut off at 13 sigma */
		dx = 13.0;
		return ((p <= 0.5) ? (dx) : (-dx));
	}
	/**  Step 1:  use 26.2.23 from Abramowitz and Stegun **/
	dt = sqrt(-2.0 * log(dp));
	dx = dt - ((.010328 * dt + .802853) * dt + 2.515517) / (((.001308 * dt + .189269) * dt + 1.432788) * dt + 1.);
	/**  Step 2:  do 3 Newton steps to improve this (uses the math library erfc function) **/
	for (newt = 0; newt < 3; newt++) {
		dq = 0.5 * erfc(dx / 1.414213562373095) - dp;
		ddq = exp(-0.5 * dx * dx) / 2.506628274631000;
		dx = dx + dq / ddq;
	}
	if (dx > 13.0)
		dx = 13.0;
	return ((p <= 0.5) ? (dx) : (-dx)); /* return with correct sign */
}
