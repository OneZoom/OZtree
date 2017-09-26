/****************************************************/
/*                                                  */
/* Fixage Dating v 1.9.8    2006-03-09              */
/*                                                  */
/* Authors: David Jacquet, Samuel Lundqvist         */
/*                                                  */
/* Compiling instructions: The following files      */
/* should be in a directory named headers (rooted   */
/* in the directory where the main file dating.c)   */
/* is located);                                     */
/* arguments.c, function_names.h, headers.h,        */
/* input_output.c, nodes.c, stat.c, struct.h, new.c */
/* Compile:                                         */
/* cc ./fixage_dating.c -lm -O3 -o ./fixage_dating  */
/* Execute and print help: ./fixage_dating -h       */
/*                                                  */
/****************************************************/

#include "headers/headers.h"

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Program that analyzes binary biolociaccaly dated tree on
///		(extended) Newick format
///	\author	D. Jacquet and S. Lunqvist
///	\date	20051021
///	\test	Some
///	\warning	Crashes if input file is empty but exists
///	\todo	Also take non binary trees. Fix negative problem
///////////////////////////////////////////////////////////////////////////////////////////
int main(int argc, char **argv) {

  set_arguments(argc,argv);
  T = (tree *)calloc(1,sizeof(tree));
  T->root = read_newick(NEWICK_FILE_NAME);
  build_and_calc_tree(T->root);


  dprint(RES_FILE , "\n\n************************************************************************************************\n");
  dprint(RES_FILE , "*  d 8   C A L C U L A T I O N                                                                 *\n");
  dprint(RES_FILE , "************************************************************************************************\n\n");


  run_mpl_fix();


  dprint(RES_FILE , "\n\n************************************************************************************************\n");
  dprint(RES_FILE , "*  M P L  C A L C U L A T I O N                                                                *\n");
  dprint(RES_FILE , "************************************************************************************************\n\n");



 run_mpl();


  dprint(RES_FILE , "\n\n************************************************************************************************\n");
  dprint(RES_FILE , "*  E N D  C A L C U L A T I O N                                                                *\n");
  dprint(RES_FILE , "************************************************************************************************\n\n");

  printf("Calculation finished.\n");

  return TRUE;
}

