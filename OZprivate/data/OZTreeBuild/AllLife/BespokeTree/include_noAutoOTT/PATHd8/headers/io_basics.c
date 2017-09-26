#ifndef IO_BASICSC
#define IO_BASICSC


/* ---------S U P P O R T I V E  F U N C T I O N S-----------------------*/
/* ----------------------------------------------------------------------*/
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	opens file , error if fail
///	\author	David Jacquet
///	\date	20051021
///	\test	NO
///////////////////////////////////////////////////////////////////////////////////////////
FILE * open_file(char *file_name,const char *handle){
  FILE *f;
  f=fopen(file_name,handle);
  if( f == NULL ){
	printf("Cannot open file %s \n" , file_name);
    error("open_file" , ERR_FILE);
  }
  return f;
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Prints vorbose information if limit >= VERBOSE
///	\author	David Jacquet
///	\date	20051021
///	\test	NO
///////////////////////////////////////////////////////////////////////////////////////////
void print_verbose (int limit , const char *format, ...){
  va_list arg;
  int done;
  va_start (arg, format);
  //QUIET = FALSE;
  //VERBOSE = 100;
  if( VERBOSE >= limit ){
	if(QUIET == FALSE)
	    done = vprintf (format, arg);
	if(RES_FILE != NULL && RES_FILE != stdout)
	    done = vfprintf (RES_FILE , format, arg);
    }
  va_end (arg);
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief Prints to booth file and stdout
///	\author	David Jacquet
///	\return	Same as used vfprintf
///	\date	20051021
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
int dprint (FILE *file,const char *format, ...){
  va_list arg;
  int done;
  done = 0;
  va_start (arg, format);

  if( QUIET == FALSE )
    done = vprintf (format, arg);
  if( file != NULL && file != stdout)
    done = vfprintf (file,format, arg);
  va_end (arg);

  return done;
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Gets the terminal in the given direction
///	\author	David Jacquet
///	\date	20051021
///	\warning crashes if n == NULL CHANGED
///	\todo
///////////////////////////////////////////////////////////////////////////////////////////
node * get_terminal(node *n,char dir){
  node *t;
  t=n;
  if( dir == LEFT )
    while( !is_terminal(t)) {
      t = t->child[0];
    }
  else
    while( !is_terminal(t)) {
      t = t->child[t->num_of_children-1];
    }
  return t;
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Check if name syntax is OK
///	\author	David Jacquet
///	\date	20051207
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
char* check_name_syntax(char *name){
	int i,len;
	char tmp;
	i=0;len=strlen(name);
	while(i<len){
		tmp = name[i];
		if( is_key_sym(tmp)==TRUE){
			printf("\n\nWrong syntax\n%-10s \"%s\"\ncontains (at least) one of the following forbidden symbols:   %c%c%c%c%c%c%c%c  \n\n",
			       "name",name , SYM_COMMA , SYM_LEFT , SYM_RIGHT ,SYM_COMMENT,SYM_COLON,SYM_COMMENT_LEFT , SYM_COMMENT_RIGHT ,SYM_EQUAL);
			error("check_name_syntax" , ERR_FORMAT);
		}
		i++;
	}
	if(len==0){
		free(name);// dj 2006-03-28
		return NULL;
	}
	return name;
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Check if string is OK as double
///	\author	David Jacquet
///	\date	20051207
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
double check_double_syntax(const char *len){
	char **check;
	double res;

	check = (char **)calloc(1, sizeof(char *));
	res = strtod(len , check);
	while(*check != len + sizeof(char)*strlen(len) && is_blank(**check)==TRUE ){
		*check += sizeof(char);
	}
	if( *check != len + sizeof(char)*strlen(len) ){
		printf("\n\nThe string \"%s\" cannot be converted to a number valid number\n\n",len);
		error("check_double_syntax" , ERR_FORMAT);
	}
	if( res < 0){
		printf("\n\nNegative number %f is not allowed\n\n",(float)res);
		error("check_double_syntax",ERR_FORMAT);
	}
	free(check);
	return res;
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Check if egde_len syntax is OK
///	\author	David Jacquet
///	\date	20051207
///	\todo	Maybe warn i rounding is not perfect ???
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
double check_edge_len_syntax(const char *len){
	double res;

	res = check_double_syntax(len);
	if( SEQUENCE_LENGTH_EXIST==TRUE){
		res = (int)(res*SEQUENCE_LENGTH);
	}
	if( res != (int)res ){
		EDGE_LENS_ARE_INTEGERS = FALSE;
	}

	return res;
}
char is_blank(char tmp){
  if(tmp != SYM_BLANK && tmp != '\n' && tmp != '\t' && tmp!= '\r' && tmp!='\v' )
    return FALSE;
  else
    return TRUE;
}

#endif
