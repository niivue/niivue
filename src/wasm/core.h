#ifndef CR_COREX_H
#define CR_COREX_H

#ifdef  __cplusplus
extern "C" {
#endif

#include <stdio.h>
#include <stdlib.h>
#ifdef USING_WASM
  #include <nifti2_wasm.h>
#else
  #include <nifti2_io.h>
#endif
#include <float.h> //FLT_EPSILON
//#include <immintrin.h>
#include <limits.h>


#ifdef USING_WASM
void *xmalloc(size_t size);
void xfree(void *p);
 #define _mm_malloc(size, alignment) xmalloc(size)
 #define _mm_free(ptr) xfree(ptr)
#endif

//CORE32 and CORE64 handle Float32 and Float64 operations, CORE handles shared code 

enum eOp { unknown,
	add,
	sub,
	mul,
	divX,
	rem,
	mod,
	mas,
	thr,
	thrp,
	thrP,
	uthr,
	uthrp,
	uthrP,
	clamp,
	uclamp,
	max,
	min,
	power,
	seed,
	inm,
	ing,
	smth,
	exp1,
	floor1,
	round1,
	trunc1,
	ceil1,
	log1,
	sin1,
	cos1,
	tan1,
	asin1,
	acos1,
	atan1,
	sqr1,
	sqrt1,
	recip1,
	abs1,
	bin1,
	binv1,
	edge1,
	index1,
	nan1,
	nanm1,
	rand1,
	randn1,
	range1,
	rank1,
	ranknorm1,
	pval1,
	pval01,
	cpval1,
	ztop1,
	ptoz1,
	dilMk,
	dilDk,
	dilFk,
	dilallk,
	erok,
	eroFk,
	fmediank,
	fmeank,
	fmeanuk,
	fmeanzerok,
	subsamp2,
	subsamp2offc
};
enum eDimReduceOp { Tmean,
					Tstd,
					Tmax,
					Tmaxn,
					Tmin,
					Tmedian,
					Tperc,
					Tar1 };

//store inputs regarding input header
typedef struct {
	int datatype;
	float scl_slope, scl_inter; 
} in_hdr;
//filter details for image resizing
//C Code From Graphics Gems III
//Dale Schumacher, "Optimization of Bitmap Scaling Operations"
//Dale Schumacher, "General Filtered Image Rescaling"
// https://github.com/erich666/GraphicsGems/tree/master/gemsiii
//see github for other filters

typedef struct {
	int	pixel;
	double	weight;
} CONTRIB;
typedef struct {
	int	n;		/* number of contributors */
	CONTRIB	*p;		/* pointer to list of contributions */
} CLIST;

typedef struct {                   /** x4 vector struct **/
    float v[4] ;
} vec4 ;

#ifdef USING_WASM
void xmemcpy ( void * destination, const void * source, size_t num );
#else
int nifti_save(nifti_image * nim, const char *postfix);
nifti_image *nifti_image_read2( const char *hname , int read_data );
int * make_kernel_file(nifti_image * nim, int * nkernel,  char * fin);
mat44 xform(nifti_image * nim);
int nifti_image_change_datatype ( nifti_image * nim, int dt , in_hdr * ihdr);
float max_displacement_mm( nifti_image * nim,  nifti_image * nim2);
#endif
vec4 setVec4(float x, float y, float z);
vec4 nifti_vect44mat44_mul(vec4 v, mat44 m );
int neg_determ(nifti_image * nim);
int nii_otsu(int* H, int nBin, int mode);
float vertexDisplacement(float x, float y, float z, mat44 m, mat44 m2);
in_hdr set_input_hdr(nifti_image * nim);
int * make_kernel(nifti_image * nim, int * nkernel, int x, int y, int z);
int * make_kernel_sphere(nifti_image * nim, int * nkernel, double mm);
CLIST * createFilter(int srcXsize, int dstXsize, int filterMethod);
double qginv( double p );
double qg( double x );

#ifdef USING_WASM
//#define printfx(...) printf(__VA_ARGS__)
#define printfx(...)
#else
#define printfx(...) fprintf(stderr, __VA_ARGS__)
#endif

#ifndef MAX //from Christian Gaser's TFCE example
#define MAX(A,B) ((A) > (B) ? (A) : (B))
#endif

#ifndef MIN
#define MIN(A,B) ((A) > (B) ? (B) : (A))
#endif

#ifndef sqr
#define sqr(x) ((x)*(x))
#endif

#define LOAD_MAT44(AA,a11,a12,a13,a14,a21,a22,a23,a24,a31,a32,a33,a34)    \
( AA.m[0][0]=a11 , AA.m[0][1]=a12 , AA.m[0][2]=a13 , AA.m[0][3]=a14 ,   \
AA.m[1][0]=a21 , AA.m[1][1]=a22 , AA.m[1][2]=a23 , AA.m[1][3]=a24 ,   \
AA.m[2][0]=a31 , AA.m[2][1]=a32 , AA.m[2][2]=a33 , AA.m[2][3]=a34 ,   \
AA.m[3][0]=AA.m[3][1]=AA.m[3][2]=0.0f , AA.m[3][3]=1.0f            )

#define LOAD_MAT33(AA,a11,a12,a13 ,a21,a22,a23 ,a31,a32,a33)    \
( AA.m[0][0]=a11 , AA.m[0][1]=a12 , AA.m[0][2]=a13 ,   \
AA.m[1][0]=a21 , AA.m[1][1]=a22 , AA.m[1][2]=a23  ,   \
AA.m[2][0]=a31 , AA.m[2][1]=a32 , AA.m[2][2]=a33            )

#ifdef  __cplusplus
}
#endif

#endif // CR_COREX_H
