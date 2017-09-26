/// HHH
#ifndef ARGUMENTS
#define ARGUMENTS
///////////////////////////////////////////////////////////////////////////////////////////
///	\author David Jacquet
///	\brief	first index : s_array eq string_to_find
///	\return	If fail , -1
///	\date	20051021
///	\test	No
///	\todo	Replace ret -1 by constant.
///////////////////////////////////////////////////////////////////////////////////////////
int find_index_in_string_array(int size, char **s_array,char *string_to_find, char mode, int error_code){
  int index;
  char string_found;
  index=0;
  string_found=FALSE;
  while( index < size && string_found == FALSE ){
    if( strcmp(s_array[index],string_to_find) == 0 ){
      string_found=TRUE;
    }
    else{
      index++;
    }
  }
  if( string_found == FALSE && mode == STRICT_MODE ){
	printf("Cannot find \n\t\"%s\"\n" , string_to_find);
	error("find_index_in_string" , error_code);
  }
  if(string_found == FALSE)
    return -1;
  return index;
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Parses command line argument to global variables
///	\author	David Jacquet
///	\date	20051021
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
void set_arguments(int arg_size, char **arg_array){
  int index;

  if( (index=find_index_in_string_array(arg_size,arg_array,HELP_PREFIX,HELP_MODE,ERR_ARG)) != -1)
    print_help();

  if( (index=find_index_in_string_array(arg_size-1,arg_array,NEWICK_FILE_PREFIX,NEWICK_FILE_MODE,ERR_ARG))!=-1){
    NEWICK_FILE_NAME = arg_array[index+1];

    if( (index=find_index_in_string_array(arg_size-1,arg_array,VERBOSE_PREFIX,VERBOSE_MODE,ERR_ARG)) != -1)
      VERBOSE = atoi(arg_array[index+1]);

    if( (index=find_index_in_string_array(arg_size-1,arg_array,RES_FILE_PREFIX,RES_FILE_MODE,ERR_ARG))!=-1)
      RES_FILE_NAME = arg_array[index+1];

    if( (index=find_index_in_string_array(arg_size-1,arg_array,TABLE_PREFIX,TABLE_MODE,ERR_ARG))!=-1)
      TABLE_FILE_NAME = arg_array[index+1];

    if( (index=find_index_in_string_array(arg_size,arg_array,PRINT_ANCESTOR_PREFIX,PRINT_ANCESTOR_MODE,ERR_ARG))!=-1)
      PRINT_ANCESTOR = TRUE;

    if( (index=find_index_in_string_array(arg_size,arg_array,PRINT_NEWICK_PREFIX,PRINT_NEWICK_MODE,ERR_ARG))!=-1)
      PRINT_NEWICK = TRUE;

    if( (index=find_index_in_string_array(arg_size,arg_array,QUIET_PREFIX,QUIET_MODE,ERR_ARG))!=-1)
      QUIET = TRUE;

    if( (index=find_index_in_string_array(arg_size-1,arg_array,CONFIDENCE_PREFIX,CONFIDENCE_MODE,ERR_ARG))!=-1)
      PROB_LIMIT = atof(arg_array[index+1]);

//    if( (index=find_index_in_string_array(arg_size,arg_array,MANY_FILES_PREFIX,MANY_FILES_MODE,ERR_ARG))!=-1){
//	QUIET          = TRUE;
//	PRINT_ANCESTOR = TRUE;
//	PRINT_NEWICK   = TRUE;
//	MPLIN_FILE  = open_file(MPLIN_FILE_NAME  = concat(NEWICK_FILE_NAME,FILE_EXT_MPLIN) , "r" );
//	MPL_FILE    = open_file(MPL_FILE_NAME    = concat(NEWICK_FILE_NAME,FILE_EXT_MPL) , "r" );
//	MPLPOS_FILE = open_file(MPLPOS_FILE_NAME = concat(NEWICK_FILE_NAME,FILE_EXT_MPLPOS) , "r" );
//	MPLD8_FILE  = open_file(MPLD8_FILE_NAME  = concat(NEWICK_FILE_NAME,FILE_EXT_MPLD8) , "r" );
//	}

 }
  else{
    if(arg_size-1 != NUM_OF_FAST_ARGS ){
	printf("\n\nCorrect syntax is:\n\n\t\t PATHd8 infile outfile\n\n");
	if(IS_ADVANCED == TRUE ){
		printf("\nOr according to:\n\n");
		print_argument();
	}
     error("set_arguments" , ERR_FAST_ARG);
    }else{
      NEWICK_FILE_NAME = arg_array[1];
      RES_FILE_NAME   = arg_array[2];
    }
    QUIET          = TRUE;
    PRINT_ANCESTOR = TRUE;
    PRINT_NEWICK   = TRUE;
  }

  if(RES_FILE_NAME != NULL){
    RES_FILE = open_file(RES_FILE_NAME,"w");
  }
}

#endif
