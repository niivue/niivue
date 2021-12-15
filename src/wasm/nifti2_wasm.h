/*
 Data structures for using niimath core32 API.
 */
#ifndef _NIFTI2_WASM_HEADER_
#define _NIFTI2_WASM_HEADER_

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <limits.h>
#include <ctype.h>
#include <inttypes.h>

/*=================*/
#ifdef  __cplusplus
extern "C" {
#endif
/*=================*/

#define DT_UNSIGNED_CHAR           2     /* unsigned char (8 bits/voxel) */
#define DT_SIGNED_SHORT            4     /* signed short (16 bits/voxel) */
#define DT_FLOAT                  16     /* float (32 bits/voxel)        */
#define DT_FLOAT32                16

typedef struct {                   /** 4x4 matrix struct **/
  float m[4][4] ;
} mat44 ;

typedef struct {                   /** 3x3 matrix struct **/
  float m[3][3] ;
} mat33 ;

typedef struct {                   /** 4x4 matrix struct (double) **/
  double m[4][4] ;
} nifti_dmat44 ;

typedef struct {                   /** 3x3 matrix struct (double) **/
  double m[3][3] ;
} nifti_dmat33 ;

typedef struct {                /*!< Image storage struct **/

  int64_t ndim ;                /*!< last dimension greater than 1 (1..7) */
  int64_t nx ;                  /*!< dimensions of grid array             */
  int64_t ny ;                  /*!< dimensions of grid array             */
  int64_t nz ;                  /*!< dimensions of grid array             */
  int64_t nt ;                  /*!< dimensions of grid array             */
  int64_t nvox ;                /*!< number of voxels = nx*ny*nz*...*nw   */
  //int nbyper ;                  /*!< bytes per voxel, matches datatype    */
  int datatype ;                /*!< type of data in voxels: DT_* code    */

  double dx ;                   /*!< grid spacings      */
  double dy ;                   /*!< grid spacings      */
  double dz ;                   /*!< grid spacings      */
  double dt ;                   /*!< grid spacings      */

  double scl_slope ;            /*!< scaling parameter - slope        */
  double scl_inter ;            /*!< scaling parameter - intercept    */
  double cal_min ;              /*!< calibration parameter, minimum   */
  double cal_max ;              /*!< calibration parameter, maximum   */
  void *data ;                  /*!< pointer to data: nbyper*nvox bytes     */

} nifti_image ;

void         nifti_image_free    ( nifti_image *nim);
float nifti_mat33_determ ( mat33 R ) ;


/*=================*/
#ifdef  __cplusplus
}
#endif
/*=================*/

#endif /* _NIFTI2_IO_HEADER_ */
