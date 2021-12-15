#include <math.h>
#include "nifti2_wasm.h"

void nifti_image_free( nifti_image *nim )
{
   if( nim == NULL ) return ;
   //if( nim->fname != NULL ) free(nim->fname) ;
   //if( nim->iname != NULL ) free(nim->iname) ;
   if( nim->data  != NULL ) free(nim->data ) ;
   //(void)nifti_free_extensions( nim ) ;
   free(nim) ; return ;
}

/*----------------------------------------------------------------------*/
/*! compute the determinant of a 3x3 matrix
*//*--------------------------------------------------------------------*/
float nifti_mat33_determ( mat33 R )   /* determinant of 3x3 matrix */
{
   double r11,r12,r13,r21,r22,r23,r31,r32,r33 ;
                                                       /*  INPUT MATRIX:  */
   r11 = R.m[0][0]; r12 = R.m[0][1]; r13 = R.m[0][2];  /* [ r11 r12 r13 ] */
   r21 = R.m[1][0]; r22 = R.m[1][1]; r23 = R.m[1][2];  /* [ r21 r22 r23 ] */
   r31 = R.m[2][0]; r32 = R.m[2][1]; r33 = R.m[2][2];  /* [ r31 r32 r33 ] */

   return (float)(r11*r22*r33-r11*r32*r23-r21*r12*r33
         +r21*r32*r13+r31*r12*r23-r31*r22*r13) ;
}
