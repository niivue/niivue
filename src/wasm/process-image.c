#include "nifti1.h"
#include "nifti2.h"
#include <stdlib.h>
#include <emscripten.h>

#define NIFTI_1_MAGIC 348
#define NIFTI_2_MAGIC 540


int InvertFloat32Image(float *, size_t);
int InvertUint8Image(uint8_t *, size_t);
int ProcessNiftiOneImage(nifti_1_header *, size_t, char *);
int ProcessNiftiTwoImage(nifti_2_header *, size_t, char *);

inline uint16_t Reverse16(uint16_t value)
{
    return (((value & 0x00FF) << 8) |
            ((value & 0xFF00) >> 8));
}
    
inline uint32_t Reverse32(uint32_t value) 
{
    return (((value & 0x000000FF) << 24) |
            ((value & 0x0000FF00) <<  8) |
            ((value & 0x00FF0000) >>  8) |
            ((value & 0xFF000000) >> 24));
}

EMSCRIPTEN_KEEPALIVE
int ProcessNiftiImage(uint8_t *nifti_byte_array, size_t file_size, char *options) {
  int size_of_header = *(int *)nifti_byte_array; 
  int swapped = Reverse32(size_of_header);
  if(size_of_header == NIFTI_1_MAGIC || swapped == NIFTI_1_MAGIC) {
    return ProcessNiftiOneImage((nifti_1_header *)nifti_byte_array, file_size, options);
  }
  else if(size_of_header == NIFTI_2_MAGIC) {
    ProcessNiftiTwoImage((nifti_2_header *)nifti_byte_array, file_size, options);
  }
  return 7;//size_of_header;
}

int ProcessNiftiOneImage(nifti_1_header *header, size_t file_size, char *options) {
  size_t offset = header->vox_offset;
  size_t array_length = file_size - offset; 
  int swapped = Reverse32(header->datatype); 
  
  char *ptr = (char *)header;
  switch(header->datatype) {
    case DT_FLOAT32:
      InvertFloat32Image((float *)&ptr[offset], array_length); 
      break;
    case DT_UINT8:
      InvertUint8Image((uint8_t *)&ptr[offset], array_length);
      break;
  }
  
  
  return header->datatype;
}

int ProcessNiftiTwoImage(nifti_2_header *header, size_t file_size, char *options) {
  return 0;
}

int InvertFloat32Image(float *image, size_t length) {
  float mx = image[0];
	for (int i = 0; i < length; i++)
		if (image[i] > mx) mx = image[i];
	for (int i = 0; i < length; ++i) {
		image[i] = mx - image[i];
	}
	return 0;
}

int InvertUint8Image(uint8_t *image, size_t length) {
  uint8_t mx = image[0];
	for (int i = 0; i < length; i++)
		if (image[i] > mx) mx = image[i];
	for (int i = 0; i < length; ++i) {
		image[i] = mx - image[i];
	}
	return 0;
}