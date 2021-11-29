#include "nifti1.h"
#include "nifti2.h"
#include <stdio.h>
#include <stdlib.h>

int ProcessNiftiOneImage(nifti_1_header *, char *);
int ProcessNiftiTwoImage(nifti_2_header *, char *);

int ProcessNiftiImage(char *nifti_byte_array, char *options) {
  int size_of_header = ((int)nifti_byte_array[0]); 
  if(size_of_header == 348) {
    ProcessNiftiOneImage((nifti_1_header *)nifti_byte_array, options);
  }
  else if(size_of_header == 540) {
    ProcessNiftiTwoImage((nifti_2_header *)nifti_byte_array, options);
  }
  return 0;
}

int ProcessNiftiOneImage(nifti_1_header *header, char *options) {
  printf("%s\n", header->aux_file);
  return 0;
}

int ProcessNiftiTwoImage(nifti_2_header *header, char *options) {
  printf("%s\n", header->aux_file);
  return 0;
}