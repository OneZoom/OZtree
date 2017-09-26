#ifndef INPUTC
#define INPUTC



/*************************************************************************************************************/
/**                                                                                                        ***/
/**            S U P O R T I T V E     S T R I N G / F I L E                                               ***/
/**                                                                                                        ***/
/*************************************************************************************************************/
int file_len(char *file_name){
  int i;
  FILE *f;
  i=0;
  f = open_file(file_name,"r");
  while( fgetc(f) != EOF)
    i++;
  return i;
}

char is_key_sym(char c){
	if(c==SYM_LEFT || c==SYM_COMMA || c==SYM_RIGHT || c==SYM_COLON || c==SYM_END || c==SYM_COMMENT || c==SYM_EQUAL || c==SYM_COMMENT_LEFT || c==SYM_COMMENT_RIGHT)
		return TRUE;
	else
		return FALSE;
}

void srdd_by_keys(char *str, int len, int pos, char *left,char *right){
	int i,j;
	i=pos-1;
	j=pos+1;
	*left=*right=FALSE;
	while(i>=0  && is_blank(str[i])==TRUE)i--;
	while(j<len && is_blank(str[j])==TRUE)j++;
	if(i==-1 ||  is_key_sym(str[i])==TRUE)
		*left=TRUE;
	if(j==len || is_key_sym(str[j])==TRUE)
		*right=TRUE;
//	printf("pos %d i %d j %d, left=%c=%d, right=%c=%d\n",pos,i,j,str[max(i,0)],*left,str[min(j,len)],*right);
}

void remove_blanks(char *str, int *len ){
	int i,pos,removed;
	char left,right,fill;
	i=pos=removed=0;
	print_verbose(V_DBG_READ, "Input str (len %d): %s\nconverted to str",*len,str);
	while(i<*len){
		fill=TRUE;
		if(is_blank(str[i])==TRUE ){
			srdd_by_keys(str,*len,i,&left,&right);

			if( left==TRUE || right==TRUE){
				fill=FALSE;
			}
		}
		if(fill==TRUE){
			str[pos]=str[i];
			pos++;
		}else{
			removed++;
		}
		i++;
	}
	if(removed>0){
		*len -= removed;
		str[pos]=0;
	}
	print_verbose(V_DBG_READ, " (len %d): %s\n",*len,str);
}
char *file2str(char *file_name , int *len){
  int i,tmp_len;
  char *f_str,tmp;
  FILE *f;

  tmp_len = file_len(file_name);
  f = open_file(file_name,"r");
  f_str = (char *) calloc(tmp_len+1,sizeof(char) );

  tmp = ' ';
  i = 0;
  while( !feof(f) && tmp != EOF){
    tmp = fgetc(f);
    if(tmp==SYM_COMMENT ){
        while( (tmp=fgetc(f)) != '\n' && tmp != EOF);
    }else if( tmp==SYM_COMMENT_LEFT){
        while( (tmp=fgetc(f)) != SYM_COMMENT_RIGHT && tmp != EOF);
	if( tmp==EOF){
             printf("\n\nSyntax error: there is a %c - %c -- mismatch around \"%s...\"\n\n",SYM_COMMENT_LEFT,SYM_COMMENT_RIGHT,f_str-max(i-10,0)*sizeof(char));
             error("file2str",ERR_FORMAT);
        }
    }
    else if(tmp!=EOF){ f_str[i] = tmp;i++;}
  }
  fclose(f);
  *len = i;
  print_verbose(V_DBG_READ, "Input file %s is read to %s\n", file_name,f_str);
  return f_str;
}

int num_of_syms(char *str , int len , char sym){
  int i,num = 0;
  for(i=0 ; i<len ; i++)
    if(str[i] == sym)
      num++;
  return num;
}

int letters2sym(char *str,int len ,  int start, char sym){
  int i=start;
  while( i<len && str[i] != sym )i++;
  if(i==len){
    printf("\n\nSyntax error\n%-15s \"%c\"\n%-15s \"%-.10s...\"\nNo match found\n\n","searched for",sym,"at",str+start*sizeof(char));
    error("letters2sym",ERR_FORMAT);
  }
  return i-start;
}

char *create_and_fill(char *big_str, int big_len , int start, int len){
  int i;
  char *str;
  str = (char *) calloc(len+1, sizeof(char));
  if( start + len > big_len){
    printf("Cannot extract letters frome string after its end\n");
    error("create_and_fill",ERR_BUG);
  }
  for(i=0 ; i<len ; i++){
    str[i] = big_str[i+start];
  }
  return str;
}

char * read_str_to_sym(char *str, int len , int *start, char sym){
	int tmp_len;
	tmp_len=letters2sym(str,len,*start,sym);
	*start += tmp_len;
	return create_and_fill(str,len,*start-tmp_len,tmp_len);
}

char next_delimiter(char *str, int len,int start){
	int i;
	i=start;
	while(i<len && str[i]!=SYM_COMMA && str[i]!=SYM_RIGHT)
		i++;
	if(i==len){
		printf("Bad syntax, no delimiter (%c %c) found when scanning from %5.5s\n",SYM_COMMA , SYM_RIGHT,str+start*sizeof(char));
		error("next_delimiter",ERR_FORMAT);
	}
	return str[i];
}
char sym_exists(char *str, int len, int start ,char sym){
	int i;
	char res;
	i=start;
	res=FALSE;
	while(i<len && res==FALSE){
		if(str[i]==sym)
			res=TRUE;
		i++;
	}
	return res;
}
/*************************************************************************************************************/
/*************************************************************************************************************/
/*************************************************************************************************************/
/*************************************************************************************************************/










/*************************************************************************************************************/
/**                                                                                                        ***/
/**            I M P O R T A N T  S T R I N G  O P E R A T I O N S                                         ***/
/**                                                                                                        ***/
/*************************************************************************************************************/
void divide_str(char *big_str   ,  int big_len,
		char **tree_str ,  int *tree_len,
		char **seq_str   , int *seq_len,
		char ***mrca_str,  int **mrca_len, int *num_mrca,
		char ***name_str,  int **name_len, int *num_name){
  int i,end_syms,tmp_len,pos;
  char *tmp_str;

  end_syms  = num_of_syms(big_str , big_len , SYM_END);
  if(end_syms==0){
	printf("\n\nYour input file does not contin a \"%c\"\n\n",SYM_END);
	error("divide_str",ERR_FORMAT);
  }
  *mrca_len = (int *) calloc( end_syms-1 , sizeof(int));
  *mrca_str = (char **) calloc(end_syms-1 , sizeof(char *));
  
  //sl 20060323
  *name_len = (int *) calloc( end_syms-1 , sizeof(int));
  *name_str = (char **) calloc(end_syms-1 , sizeof(char *));

  
  i=pos=*num_mrca=*num_name=0;
  *seq_str=*tree_str=NULL;
  while(i<end_syms){
	tmp_len = letters2sym(big_str,big_len,pos,SYM_END)+1;
        tmp_str = create_and_fill(big_str,big_len,pos,tmp_len);
	if(tmp_len==1){
		printf("\n\nFile starts \"%d\" or there are two \"%c\" in a row at \"%10.10s...\"\n\n",
			SYM_END,SYM_END,big_str+pos*sizeof(char));
			error("divide_str",ERR_FORMAT);
	}

	if(strncasecmp(tmp_str, SEQUENCE_LENGTH_WORD,sizeof(char)) == 0 && *seq_str==NULL){
		*seq_str = tmp_str;
		*seq_len = tmp_len;
		print_verbose(V_DBG_READ , "Divide str seq : --%s--%d--\n",tmp_str,tmp_len);
	}else if(tmp_str[0]==SYM_LEFT && *tree_str==NULL){
		*tree_str = tmp_str;
		*tree_len = tmp_len;
		print_verbose(V_DBG_READ , "Divide str tree: --%s--%d--\n",tmp_str,tmp_len);
	}else if(strncasecmp(tmp_str,MRCA_WORD,sizeof(char)) == 0){
		(*mrca_str)[*num_mrca]=tmp_str;
		(*mrca_len)[*num_mrca]=tmp_len;
		print_verbose(V_DBG_READ , "Divide str mrca: --%s--%d--(nr %d)--\n",tmp_str,tmp_len,*num_mrca);
		(*num_mrca) += 1;
	}else if(strncasecmp(tmp_str, NAMING_WORD, sizeof(char)) == 0){
	  	  (*name_str)[*num_name]=tmp_str;
		  (*name_len)[*num_name]=tmp_len;
	  print_verbose(V_DBG_READ , "Divide str name of mrca: --%s--%d--(nr %d)--\n",tmp_str,tmp_len,*num_name);
	   (*num_name) += 1;
	}else{
	  if(strncasecmp(tmp_str, SEQUENCE_LENGTH_WORD,sizeof(char)) == 0 && *seq_str!=NULL){
	    printf("\n\nThere are several attemps to define \"%s\", second is found at \"%10.10s...\"\n\n",								SEQUENCE_LENGTH_WORD,big_str+pos*sizeof(char));
		}
		else if(tmp_str[0]==SYM_LEFT && *tree_str!=NULL){
			printf("\n\nThere are several attemps to define the Newick tree, second is found at \"%10.10s...\"\n\n",						big_str+pos*sizeof(char));
		}
		else{
			printf("\n\nThere is a format error occuring at \"%10.10s...\"\n\n",big_str+pos*sizeof(char));
		}
		error("divide_str",ERR_FORMAT);
	}
	pos += tmp_len;
	i++;
  }
	if(*tree_str == NULL){
		printf("\n\nDid not find a newick tree in input file\n\n");
		error("divide_str",ERR_FORMAT);
	}

}
int num_children(char *str, int len, int pos){
	int i,nl,nr,nc;
	char c;
	i=pos;
	nl=0;
	nr=nc=0;
	while( (nl>nr || i==pos) && i<len){
		c=str[i];
		if(c==SYM_COMMA && nl == nr+1)
			nc++;
		if(c==SYM_LEFT)
			nl++;
		if(c==SYM_RIGHT)
			nr++;
	i++;
	}
	if(nl!=nr){
		printf("\n\nParanthesis mismatch when scanning from \"%10.10s...\"\n\n",str+pos*sizeof(char));
		error("num_children",ERR_FORMAT);
	}
	else if(nc==0 && nl>0){
	  printf("\n\nThe node  \"%-.10s...\" has only one child, it must have at least two.\nThere is probably a \"%c\" missing.\n\n",str+pos*sizeof(char),SYM_COMMA);
	  error("num_children",ERR_FORMAT);
	}
	if(nc>0)
	  nc++;
	print_verbose(V_DBG_READ , "Segment mother of %5.5s... has %d children\n",str+pos*sizeof(char), nc);
	return nc;
}
int readT_str(char *str , int len,int pos, node **root, node *n,int child_nr) {
	int i;
	char tmp,delimiter, *name , *edge_len;
	double dummy;
	print_verbose(V_DBG_READ , "readT_str from %5.5s... node = %d\n",str+pos*sizeof(char) , n);
	if(*root == NULL){
	  if( num_children(str,len,pos)<2 ){
		printf("\n\nRoot of  Newick tree \"%10.10s...\" has no children according to %c %c %c-matching\nThrere is prabably a paranthesis mismatch\n\n",str,SYM_LEFT,SYM_COMMA,SYM_RIGHT);
		error("readR_str",ERR_FORMAT);
	  }
	  *root = create_node(num_children(str,len,pos));
	  n    = *root;
	  pos++;
	}
	for (i = 0; i < n->num_of_children ; i++) {
		n->child[i] = create_node(num_children(str,len,pos));
		n->child[i]->mother = n;
		tmp = str[pos];
		print_verbose(V_READ , "Read (1) tree from: %10.10s node %d, child %d < %d \n",str+pos*sizeof(char),n,i,n->num_of_children);
		if( tmp == SYM_LEFT ){ //new subtree, start recursion
			pos = readT_str(str, len, pos+1 ,root, n->child[i],i);
		}
		delimiter = next_delimiter(str,len,pos+1);
		name      = read_str_to_sym(str,len,&pos,SYM_COLON);pos++;
		edge_len  = read_str_to_sym(str,len,&pos, delimiter);pos++;
		print_verbose(V_DBG_READ , "Read: name--%s--edge_len--%s--delimiter--%c-- \n",name,edge_len,delimiter);

		n->child[i]->name = check_name_syntax( name );
		n->edge_len[i]    = check_edge_len_syntax( edge_len );
	}

	if(n==*root){
		if( str[pos]!=SYM_END){
			name      = read_str_to_sym(str,len,&pos,SYM_COLON);pos++;
			n->name = check_name_syntax( name );
		}
		if(str[pos]!=SYM_END){
			edge_len  = read_str_to_sym(str,len,&pos, SYM_END);pos++;
			dummy     = check_edge_len_syntax(edge_len);
			dprint(RES_FILE, "\nWARNING -- root egde len %f is ignored\n",(float)dummy);
		}
	}
	print_verbose(V_DBG_READ , "OUT readT_str from %5.5s... node = %d\n",str+pos*sizeof(char),n);
	return pos;
}

//maybe check for double definitions
void fill_name_data(node *n,char *name1, char *name2, char *new_name) {
  if( (n->name) != NULL)
     free(n->name); // dj 2006-03-28
  n->name = new_name;
}


///////////////////////////////////////////////////////////////////////////////////////////
///     \brief  Fills fixage info from parsed parameters minage, maxage
///     \author DJ
///     \date   20051021
///     \test   No
///     \todo   maybe dprint for the warning
///     \warning Changed 2005-11-28, 2005-12-07 dj, 2006-03-21 sl,
///////////////////////////////////////////////////////////////////////////////////////////
void fill_fixage_data(node *n,char *name1,char *name2,char *text,double age) {
  if( strcasecmp(text,R8S_FIX) == 0 ){
    if( is_fixnode(n) == TRUE && n->fix->fixage != age){
      contradicting_node_error(name1, name2, "fix", n->fix->fixage, "fix", age);
    }
    else {
      if (is_maxnode(n) == TRUE) {
	if (n->fix->maxage < age) {
	  contradicting_node_error(name1, name2, "max", n->fix->maxage, "fix", age);
	} else {
	  fix_and_minmax_node_warning(name1, name2, "max", age);
	  NUM_MAX--;
	  n->fix->is_maxnode = FALSE;
	}
      }
      if (is_minnode(n) == TRUE) {
	if (n->fix->minage > age) {
	  contradicting_node_error(name1, name2, "min", n->fix->minage, "fix", age);
	} else {
	  fix_and_minmax_node_warning(name1, name2, "min", age);
	  NUM_MIN--;
	  n->fix->is_minnode = FALSE;
	}
      }
      NUM_FIX++;
      n->fix->is_fixnode = TRUE;
      n->fix->fixage = age;
    }
  } else if (  strcasecmp(text,R8S_MAX) == 0 ){
    if (!is_minnode(n) && !is_maxnode(n) && !is_fixnode(n)) {
      NUM_MAX++;
      n->fix->is_maxnode = TRUE;
      n->fix->maxage = age;
    } else {
      if (is_fixnode(n)) {
	if (n->fix->fixage  > age) {
	  contradicting_node_error(name1, name2, "max", age, "fix", n->fix->fixage);
	} else {
	  fix_and_minmax_node_warning(name1, name2, "max", n->fix->fixage);	  
	}
      }
      if( is_maxnode(n) == TRUE ){
	n->fix->maxage = min(n->fix->maxage, age);
	double_minmax_warning(name1, name2, "max", n->fix->maxage);
      } 
      if (is_minnode(n)) {
	if (n->fix->minage > age) {
	  minmax_node_error(name1, name2, n->fix->minage, age);
	} else if (n->fix->minage == age) {
	  minmax_equals_warning(name1, name2, age);  
	  NUM_MIN--;
	  NUM_FIX++;
	  n->fix->is_minnode = FALSE;
	  n->fix->is_fixnode = TRUE;
	  n->fix->fixage = age;
	} else {
	  NUM_MAX++;
	  n->fix->is_maxnode = TRUE;
	  n->fix->maxage = age;
	}
      }
      if (!is_minnode(n) && !is_maxnode(n) && !is_fixnode(n)) { 
	NUM_MAX++;
	n->fix->is_maxnode = TRUE;
	n->fix->maxage = age;
      }
    }
  } else if (strcasecmp(text,R8S_MIN) == 0 ) {
    if (!is_minnode(n) && !is_maxnode(n) && !is_fixnode(n)) {
      NUM_MIN++;
      n->fix->is_minnode = TRUE;
      n->fix->minage = age;
    } else {
      if (is_fixnode(n)) {
	if (n->fix->fixage  < age) {
	  contradicting_node_error(name1, name2, "min", age, "fix", n->fix->fixage);
	} else {
	  fix_and_minmax_node_warning(name1, name2, "min", n->fix->fixage);
	}
      }
      if (is_minnode(n) == TRUE ){
	n->fix->minage = max(n->fix->minage, age);
	double_minmax_warning(name1, name2, "min", n->fix->minage);
      }
      if (is_maxnode(n)) {
	if (n->fix->maxage < age) {
	  minmax_node_error(name1, name2, age, n->fix->maxage);
	} else if (n->fix->maxage == age) {
	  minmax_equals_warning(name1, name2, age);
	  NUM_MAX--;
	  NUM_FIX++;
	  n->fix->is_maxnode = FALSE;
	  n->fix->is_fixnode = TRUE;
	  n->fix->fixage = age;
	} else {
	  NUM_MIN++;
	  n->fix->is_minnode = TRUE;
	  n->fix->minage = age;
	}
      }
    }
  }
} 

//SL 20060322
void minmax_equals_warning(char *name1, char *name2, double age) {
  printf("\n\nWarning. The node with mrca %s and %s is defined to be \n", name1, name2);
  printf("1. A minnode with minage %f\n", age);
  printf("2. A maxnode with maxage %f\n", age);
  printf("PATHd8 will consider the node to be a fixnode with fixage %f\n", age);
}

//SL 20060322
void minmax_node_error(char *name1, char *name2, double minage, double maxage) {
  printf("\n\nThe node with mrca %s and %s is defined to be \n", name1, name2);
  printf("1. A minnode with minage %f\n", minage);
  printf("2. A maxnode with maxage %f\n", maxage);
  printf("This is a contradiction.\n");
  error("fill_fixage_data",ERR_FORMAT);
}

//SL 20060322
void double_minmax_warning(char *name1, char *name2, char *type, double new_age) {
  printf("\n\nWarning. The node with mrca %s and %s is defined as a %snode more than once.", name1, name2, type);
  printf("\nPATHd8 will consider the node to be a %snode with %sage %f.\n", type, type, new_age);
}

//SL 20060322
void fix_and_minmax_node_warning(char *name1, char *name2, char *type, double new_age) {
  printf("\n\nWarning. The node with mrca %s and %s is defined both as a %snode", name1, name2,type);
  printf(" and as a fixnode.\n");
  printf("PATHd8 will consider the node to be a fixnode with fixage %f.\n", new_age);
}

//SL 20060322
void contradicting_node_error(char *name1, char *name2, char *old_type, double old_age, char *new_type, double new_age) {
  printf("\n\nThe node with mrca %s and %s is defined to be \n", name1, name2);
  printf("1. A %snode with %sage %f\n", old_type,old_type,old_age);
  printf("2. A %snode with %sage %f\n", new_type, new_type, new_age);
  printf("This is a contradiction.\n");
  error("fill_fixage_data",ERR_FORMAT);
}	      


//SL 20060323, a simple copy of fill_fixage_from_str
void fill_name_from_str(char *str,int len, node *root){
  int pos;
  node *n,*n1,*n2;
  char *word,*name1,*name2,*t,*new_name;


  pos      = 0;
  word     = read_str_to_sym(str,len,&pos,SYM_COLON);pos++;//printf("word %s\n",word);
  name1    = read_str_to_sym(str,len,&pos,SYM_COMMA);pos++;//printf("nam1 %s\n",name1);
  name2    = read_str_to_sym(str,len,&pos,SYM_COMMA);pos++;//printf("nam2 %s\n",name2);
  t        = read_str_to_sym(str,len,&pos,SYM_EQUAL);pos++;//printf("type %s\n",t);
  new_name = read_str_to_sym(str,len,&pos,SYM_END  );pos++;//printf("type %s\n",new_name);

  print_verbose(V_DBG_READ , "CONSTRAINT %s--%s--%s--%s--%s\n",word,name1,name2,t,new_name);
  if(strcasecmp(word,NAMING_WORD)!=0 ){
    printf("\n\nWrong syntax\n%-10s \"%s\"\n%-10s \"%s\"\n%-10s \"%s\"\n\n","you wrote",word,"instead of",NAMING_WORD,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }

  if (strcasecmp(t, NAMING_KEY) != 0) {
    printf("\n\nWrong syntax\n%-10s \"%s\"\n%-10s \"%s\"\n%-10s \"%s\"\n\n","you wrote",t,"instead of","name","at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }

  if(find_node(name1,root,&n1) == FALSE){
    printf("\n\n%-10s \"%s\"\n%-10s \"%s\"\ndoes not exist in the Newick tree\n\n","Node name",name1,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }
  if(find_node(name2,root,&n2) == FALSE){
    printf("\n\n%-10s \"%s\"\n%-10s \"%s\"\ndoes not exist in the Newick tree\n\n","Node name",name2,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }
  n = mrca(n1,n2);

  fill_name_data(n,name1,name2,new_name);
  free(word);
  free(name1);
  free(name2);
  free(t);
}


void fill_fixage_from_str(char *str,int len, node *root){
  int pos;
  node *n,*n1,*n2;
  char *word,*name1,*name2,*t,*limit;
  double num;


  pos = 0;
  word  = read_str_to_sym(str,len,&pos,SYM_COLON);pos++;//printf("word %s\n",word);
  name1 = read_str_to_sym(str,len,&pos,SYM_COMMA);pos++;//printf("nam1 %s\n",name1);
  name2 = read_str_to_sym(str,len,&pos,SYM_COMMA);pos++;//printf("nam2 %s\n",name2);
  t     = read_str_to_sym(str,len,&pos,SYM_EQUAL);pos++;//printf("type %s\n",t);
  limit = read_str_to_sym(str,len,&pos,SYM_END  );pos++;//printf("type %s\n",limit);

  print_verbose(V_DBG_READ , "CONSRAINT %s--%s--%s--%s--%s\n",word,name1,name2,t,limit);
  num = check_double_syntax(limit);
  if( num < 0 ){
    printf("\n\nNegative %s-constraints are not permitted, wrong at %s \n\n",MRCA_WORD,str);
    error("fill_fixage_from_file" , ERR_FORMAT);
  }
  if(strcasecmp(word,MRCA_WORD)!=0 ){
    printf("\n\nWrong syntax\n%-10s \"%s\"\n%-10s \"%s\"\n%-10s \"%s\"\n\n","you wrote",word,"instead of",MRCA_WORD,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }

  if(find_node(name1,root,&n1) == FALSE){
    printf("\n\n%-10s \"%s\"\n%-10s \"%s\"\ndoes not exist in the Newick tree\n\n","Node name",name1,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }
  if(find_node(name2,root,&n2) == FALSE){
    printf("\n\n%-10s \"%s\"\n%-10s \"%s\"\ndoes not exist in the Newick tree\n\n","Node name",name2,"at",str);
    error("fill_fixage_from_str",ERR_FORMAT);
  }
  n = mrca(n1,n2);
  fill_fixage_data(n,name1,name2,t,num);
  free(word);
  free(name1);
  free(name2);
  free(t);
  free(limit);
}
//SL 20060322 a simple copy from fill_fixage
void fill_name(char **name_str, int len, int *name_len, node *root) {
  int i;
  for (i = 0; i < len; i++) {
    fill_name_from_str(name_str[i], name_len[i], root);
  }
}

void fill_fixage(char **mrca_str,int len, int *mrca_len,node *root){
  int i;
  for(i=0;i<len;i++)
    fill_fixage_from_str(mrca_str[i],mrca_len[i],root);
  if( NUM_FIX == 0){

  }
}
void fill_seq_len(char *str, int len){
	int pos;
	char *word,*sl;
	if(str != NULL){
		SEQUENCE_LENGTH_EXIST = TRUE;
		pos=0;
		word = read_str_to_sym(str,len,&pos,SYM_EQUAL);pos++;//printf("word %s\n",word);
		sl   = read_str_to_sym(str,len,&pos,SYM_END);pos++;//printf("word %s\n",word);
		if(strcasecmp(word,SEQUENCE_LENGTH_WORD)!=0){
 			printf("\n\nWrong syntax\n%-10s \"%s\"\n%-10s \"%s\"\n%-10s \"%s\"\n\n","you wrote",word,"instead of",SEQUENCE_LENGTH_WORD,"at",str);
			error("fill_fixage_from_str",ERR_FORMAT);
 		}
		SEQUENCE_LENGTH = check_double_syntax(sl);
		free(sl);
		free(word);
	}
}
node * read_newick(char *file_name){

  node *root;
  char *str,*tree_str,*seq_str,**mrca_str, **name_str;
  int str_len,tree_len,seq_len,*mrca_len,num_mrca, *name_len, num_name;

  root = NULL;

  str = file2str(file_name , &str_len);
  remove_blanks(str,&str_len);
  if(str[str_len-1] != SYM_END){
     printf("\n\nNo ending \"%c\" found at input end      (input end=\"%-.10s\")\n\n\n",SYM_END,str+max(str_len-10,0)*sizeof(char));
     error("read_newick",ERR_FORMAT);
  }

  divide_str(str,str_len,&tree_str,&tree_len,&seq_str,&seq_len,&mrca_str,&mrca_len,&num_mrca,&name_str,&name_len,&num_name);
  fill_seq_len(seq_str,seq_len);
  readT_str(tree_str,tree_len,0 , &root , root , 0);
 // print_nodes(root,PM_INPUT);
  fill_fixage(mrca_str,num_mrca,mrca_len,root);
  fill_name(name_str,num_name,name_len,root);

  return root;
}

#endif
