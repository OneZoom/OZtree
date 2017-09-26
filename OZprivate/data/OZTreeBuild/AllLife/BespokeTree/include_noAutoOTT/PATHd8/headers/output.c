#ifndef OUTPUTC
#define OUTPUTC


/* ---------P R I N T I N G   F U N C T I O N S--------------------------*/
/* ----------------------------------------------------------------------*/
void error(char *function , int code){
	if(IS_ADVANCED==TRUE){
		printf("\n\n Exiting from function \"%s\" , with code %d\n\n",function ,  code);
	}
	exit(code);
}
void print_fixage_data(node *n){
  exit(1); //This function is not well defined
  if( n->fix->is_minnode==TRUE || n->fix->is_maxnode==TRUE || n->fix->is_fixnode==TRUE ){
    dprint(RES_FILE , "%c%.1f%c%.1f%c",SYM_COMMENT_LEFT , n->fix->minage , SYM_COMMA , n->fix->maxage , SYM_COMMENT_RIGHT );
 }
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Prints the node line ?
///	\author	DJ
///	\date	20051021
///	\test	No
///     \todo   Check the comment on the 8:th line in previous versions. Rename
///	\warning Changed 2005-11-28 What is a node line really? The 8:th line in previous versions should be: ep = n->mother->left_edge_pos
///////////////////////////////////////////////////////////////////////////////////////////


void print_node_line( node *n, char print_mode ){
  double len,mmpl,mpl,ep;
  char neg;
  int i=0;
  neg = FALSE;
  if( n->mother != NULL ){
    if( n->name != NULL ) dprint(RES_FILE,"%s",n->name);
    while (n->mother->child[i] != n) i++;
    len = n->mother->edge_len[i];
    ep  = n->mother->edge_pos[i];
    mpl  = n->mpl;
    mmpl = n->mother->mpl;
    if( print_mode == PM_INPUT ){
      dprint(RES_FILE,"%c%6f",SYM_COLON,len);
    }
    if( print_mode == PM_NONEG ){
      if( mmpl - mpl < 0 )
	dprint(RES_FILE,"%.1f [%s %6.1f]",(double)0,NEG_SYM,mmpl-mpl);
      else
	dprint(RES_FILE,"%c%6.1f",SYM_COLON,ep);
    }
    if( print_mode == PM_FINAL ){
      dprint(RES_FILE,"%c%6.1f[+/-%6.2f]",SYM_COLON,mmpl,prob2normval(PROB_LIMIT) * sqrt(n->mother->var) );
    }
    if( print_mode == PM_FIXAGE ){
      dprint(RES_FILE,"%c%f",SYM_COLON,n->mother->fix->calc_age - n->fix->calc_age );
    }
    if(print_mode == PM_MPLIN){
      dprint(RES_FILE,"%c%f",SYM_COLON,len);
    }

    if(print_mode == PM_MPL){
      dprint(RES_FILE,"%c%f",SYM_COLON,n->mother->mpl - n->mpl );
    }
    if(print_mode == PM_MPLPOS){
      dprint(RES_FILE,"%c%f",SYM_COLON,n->mother->mpl_pos - n->mpl_pos );
    }
    if(print_mode == PM_MPLD8){
      dprint(RES_FILE,"%c%f",SYM_COLON,n->mother->fix->calc_age - n->fix->calc_age );
    }
  }
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Prints the nodes recursively
///	\author	DJ
///	\date	20051021
///	\test	No
///     \todo   Remove root-argument
///	\warning Changed 2005-11-28 the root-argument is newer used
///////////////////////////////////////////////////////////////////////////////////////////
void print_nodes_rec(node *root,node *n, char print_mode){
  int i;
  if( !is_terminal(n)){
    if( n->accepted == FALSE && print_mode == PM_FINAL)
      dprint(RES_FILE,"[%s %4.2e]",REJ_WORD, 1.0-n->prob);
    if(print_mode == PM_INPUT && FIXAGE_MODE == TRUE)
      print_fixage_data(n);
    dprint(RES_FILE,"%c",SYM_LEFT);
    for (i =0 ; i < n->num_of_children-1; i++) {
      print_nodes_rec(root,n->child[i],print_mode);
      dprint(RES_FILE,"%c",SYM_COMMA);
    }
    print_nodes_rec(root,n->child[n->num_of_children-1],print_mode);
    dprint(RES_FILE,"%c",SYM_RIGHT); 
  }
  print_node_line(n,print_mode);
}



void print_nodes(node *node,char print_mode){
  print_nodes_rec(node,node,print_mode);
  // To print out root node name if set, root edge_len is ingored and set to 0
  // These lines may be removed?
  if(node->name!=NULL)
    dprint(RES_FILE , "%s:0" , node->name);
  dprint(RES_FILE,"%c\n",SYM_END);
}

void print_ancestor_line(node *n){
  node *lt,*rt;

  if( ! is_terminal(n) ){
    lt=get_terminal(n,LEFT);
    rt=get_terminal(n,RIGHT);

    dprint(RES_FILE,"%-20s %-20s ",lt->name,rt->name);
    if( n->name == NULL )
       dprint(RES_FILE , "%-20s ", "-");
    else
       dprint(RES_FILE , "%-20s ", n->name);

    if(EDGE_LENS_ARE_INTEGERS == TRUE ){
       dprint(RES_FILE,"%10.3f +/- %-10.3f",n->mpl,prob2normval(1-PROB_LIMIT) * sqrt(n->var));
    }
    else{
       dprint(RES_FILE,"%10.3f +/- %-10s",n->mpl,STAT_MISSING);
    }
    dprint(RES_FILE , "%12d " , n->num_of_terminals);

    //printf("chis: %f free:%d prob:%f\n", n->chi_sq, n->num_of_children-1, n->prob);

	if(EDGE_LENS_ARE_INTEGERS == FALSE){
	      dprint(RES_FILE,"%14s",STAT_MISSING);
	}
	else if( n->accepted == FALSE )
      		dprint(RES_FILE,"%8s, %s%f",REJ_WORD, "prob=",(double)n->prob);
    	else
      		dprint(RES_FILE,"%8s",ACC_WORD);
    dprint(RES_FILE,"\n");
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Prints the ancestor line
///	\author	DJ
///	\date	20051021
///	\test	No
///     \todo
///	\warning Changed 2005-11-28
///////////////////////////////////////////////////////////////////////////////////////////

void print_ancestor(node *n){
  int i;
  if( ! is_terminal(n) && PRINT_ANCESTOR == TRUE){

    if( n->mother == NULL ){

      dprint(RES_FILE , "%-20s %-20s %-20s %10s %s %10s %11s %16s %s/%s\n","Ancestor of","Ancestor of","Name"," ", "MPL", " " , "#Terminals","Clock test:",ACC_WORD,REJ_WORD);
    }

    print_ancestor_line(n);
    for (i = 0; i < n->num_of_children; i++) print_ancestor(n->child[i]);
  }
}

void print_ancestor_age_line(node *n){
  node *lt,*rt;
  double min, max;

  if( ! is_terminal(n) ){
    lt=get_terminal(n,LEFT);
    rt=get_terminal(n,RIGHT);

    dprint(RES_FILE,"%-20s %-20s ", lt->name,rt->name);

    if( n->name == NULL )
       dprint(RES_FILE , "%-20s ", "-");
    else
       dprint(RES_FILE , "%-20s ", n->name);

    dprint(RES_FILE,"%10.3f ",n->fix->calc_age);
    dprint(RES_FILE,"%11d ",n->num_of_terminals);
    dprint(RES_FILE,"%16.3f ",n->mpl);
    dprint(RES_FILE,"%14f ",n->mpl / n->fix->calc_age);
    min = n->fix->minage;
    max = n->fix->maxage;
    
    if( is_fixnode(n)==TRUE && is_forced_fixnode(n) == FALSE){
      min = max = n->fix->fixage;
    }
    if( is_minnode(n)==FALSE && !(is_fixnode(n) == TRUE && is_forced_fixnode(n)==FALSE) )
      dprint(RES_FILE,"%11s " ,"-");
    else
      dprint(RES_FILE,"%11.1f " ,min);
    if( is_maxnode(n)==FALSE && !(is_fixnode(n) == TRUE && is_forced_fixnode(n) == FALSE) )
      dprint(RES_FILE,"%11s " ,"-");
    else
      dprint(RES_FILE,"%11.1f ",max);

    dprint(RES_FILE,"\n");
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Prints the ancestor age
///	\author	DJ
///	\date	20051021
///	\test	No
///     \todo   Change MinaAge to MinAge (not changed due to diff-test)
///     why write minage & maxage but not fixage?
///	\warning Changed 2005-11-28 
///////////////////////////////////////////////////////////////////////////////////////////

void print_ancestor_age(node *n){
  int i;
  if( ! is_terminal(n) && PRINT_ANCESTOR == TRUE){

    if( n->mother == NULL ){
      dprint(RES_FILE , "%-20s %-20s %-20s %10s %11s %16s %14s %11s %11s\n", "Ancestor of","Ancestor of","Name","Age","#Terminals","MPL","Rate *", R8S_MIN , R8S_MAX);
    }

    print_ancestor_age_line(n);
    for (i = 0; i < n->num_of_children; i++) print_ancestor_age(n->child[i]);
  }
}

void print_result(){
  if(FIXAGE_MODE == FALSE){
    if(EDGE_LENS_ARE_INTEGERS == FALSE) {
      dprint(RES_FILE,"\nWarning -- not every edge len was an integer -- no statistical test could be performed.");
      dprint(RES_FILE,"\n           %s indicates non computable statistical data.\n\n\n", STAT_MISSING);
      dprint(RES_FILE,"Clock test confidence: %s\n", STAT_MISSING);
      dprint(RES_FILE,"Clock tests          : %s\n", STAT_MISSING);
      dprint(RES_FILE,"Accepted             : %s\n", STAT_MISSING);
      dprint(RES_FILE,"Rejected             : %s\n", STAT_MISSING);
    } else {
      dprint(RES_FILE,"Clock test confidence: %f\n", PROB_LIMIT);
      dprint(RES_FILE,"Clock tests          : %d   (one for each node)\n",T->num_of_rejected+T->num_of_accepted);
      dprint(RES_FILE,"Accepted             : %d\n",T->num_of_accepted);
      dprint(RES_FILE,"Rejected             : %d\n",T->num_of_rejected);
    }
  }
  else{
    dprint(RES_FILE,"Number of informative fixnodes: %3d\n", NUM_FIX);
    dprint(RES_FILE,"Number of informative minnodes: %3d\n", NUM_MIN);
    dprint(RES_FILE,"Number of informative maxnodes: %3d\n", NUM_MAX);

  }
  dprint(RES_FILE,"\n");
  
  if( PRINT_NEWICK == TRUE ){
    if(FIXAGE_MODE == FALSE){
      //dprint(RES_FILE,"Input tree : "); print_nodes(T->root,PM_INPUT);
      // Internal name is mpl_pos, external name mpl
      //dprint(RES_FILE,"MPL tree %-2.2s: ",MPL_TREE_FOOTNOTE_MARK); print_nodes(T->root,PM_MPLPOS);
      dprint(RES_FILE,"MPL tree   : "); print_nodes(T->root,PM_MPLPOS);
    }
    else {
      dprint(RES_FILE,"d8 tree    : "); print_nodes(T->root,PM_MPLD8);
    }
    dprint(RES_FILE,"\n");

  }

  if(PRINT_ANCESTOR == TRUE ){
    if( FIXAGE_MODE == FALSE){
      print_ancestor(T->root);
      
      //      printf("\n\n");
      //printf("%3s) %s\n","*","Tree is build with mean path len. If child is older than mother, then child's age is replaced with mother's."
  }
    else{
      print_ancestor_age(T->root);
      
      dprint(RES_FILE , "\n\n");
      dprint(RES_FILE , "%3s) %s\n","*","Rate = MPL / Age");
  
    } 
 }
}
void print_info(){
  
  if( FIXAGE_MODE)
    printf("PROGRAM FIXAGE_DATING, calculates age of a biological tree on extended Newick format\n");
  else
    printf("PROGRAM DATING, analysis a biological tree on Newick format\n");

}
void print_ouput_info(){
  //  printf("OUTPUT  [%s,%s,%s]\n",PRINT_NEWICK_PREFIX,PRINT_ANCESTOR_PREFIX,VERBOSE_PREFIX);
  printf("OUTPUT  [%s,%s]\n",PRINT_NEWICK_PREFIX,PRINT_ANCESTOR_PREFIX);
  printf("....................................................................\n");
  printf("Input data      [%3s]: Prints input data as given in the Newick file.\n",PRINT_NEWICK_PREFIX);
  printf("Calculated ages [%3s]: Exactly as input data, but calculated age is written instead\n",PRINT_NEWICK_PREFIX);
  printf("                       of given edge lenghts. Trees that have not passed the test\n");
  printf("                       are marked with [%s,prob]\n",REJ_WORD);
  printf("Negative check  [%3s]: Exactly as input data, but calculated egde length is written\n",PRINT_NEWICK_PREFIX);
  printf("                       instead of edge lengths. Trees with negative estimated edge lenghts\n");
  printf("                       are market with [%s,calculated edge length]\n",NEG_SYM);
  printf("Ancestor output [%3s]: A more friendly output, where each node is identified by\n",PRINT_ANCESTOR_PREFIX);
  printf("                       two terminals who has this node as their most recent common\n");
  printf("                       ancestor. Each node is marked with the [rejection/acception]\n");
  printf("                       symbol [%s / %s]\n",REJ_WORD,ACC_WORD);
  // printf("Verbose output  [%3s]: Prints detailed information of each staistical test\n",VERBOSE_PREFIX);
  printf("....................................................................\n");
}
void print_table_info(){
  printf("TABLE [%s]\n",TABLE_PREFIX);
  printf("....................................................................\n");
  printf("         Given table must be contained in a file formated according to\n");
  printf("\n                VAL\\s+PROB( X <= VAL)\\s+...\n\n");
  printf("         where 0.5<=VAL<1.0 and X is normally distributed. Here \\s+ stand for one\n");
  printf("         or more of the symbols '\\n', '\\t' or ' '.\n");
  printf("         Included normal distribution table has 333 entries and VAL = 0.0 ... 6.5\n");
  printf("....................................................................\n");
}
void print_argument_line(char *prefix , char *expl , int mode){
  if(mode == NORMAL_MODE)
    printf("%-8s %-50s %-10s\n",prefix,expl,"optional");
  else if(mode == STRICT_MODE)
    printf("%-8s %-50s %-10s\n",prefix,expl,"mandatory");


}
void print_argument(){

printf("%-8s %-50s %-10s\n","Prefix","Explanation","Mode");

 printf("....................................................................\n");
 print_argument_line(NEWICK_FILE_PREFIX,NEWICK_FILE_EXPL,NEWICK_FILE_MODE);
 print_argument_line(RES_FILE_PREFIX,RES_FILE_EXPL,RES_FILE_MODE);
 print_argument_line(PRINT_ANCESTOR_PREFIX,PRINT_ANCESTOR_EXPL,PRINT_ANCESTOR_MODE);
 print_argument_line(PRINT_NEWICK_PREFIX,PRINT_NEWICK_EXPL,PRINT_NEWICK_MODE);
 //  print_argument_line(VERBOSE_PREFIX,VERBOSE_EXPL,VERBOSE_MODE);
 print_argument_line(QUIET_PREFIX,QUIET_EXPL,QUIET_MODE);
 print_argument_line(TABLE_PREFIX,TABLE_EXPL,TABLE_MODE);
 print_argument_line(CONFIDENCE_PREFIX,CONFIDENCE_EXPL,CONFIDENCE_MODE);
 print_argument_line(HELP_PREFIX,HELP_EXPL,HELP_MODE);
 printf("....................................................................\n");
}
void print_examples(){
  printf("EXAMPLES\n");
  printf("....................................................................\n");

  printf("Print minimal info, to file only\n");
  printf("             dating %s infile.tree %s res_file %s\n",NEWICK_FILE_PREFIX,RES_FILE_PREFIX,QUIET_PREFIX);
  
  printf("Print ancestor info and Newick like ouput to both screen and file\n");
  printf("             dating %s infile.tree %s res_file %s %s\n",NEWICK_FILE_PREFIX,RES_FILE_PREFIX,PRINT_ANCESTOR_PREFIX,PRINT_NEWICK_PREFIX);

  printf("Print ancestor information, to file only\n");
  printf("             dating %s infile.tree %s res_file %s %s\n\n",NEWICK_FILE_PREFIX,RES_FILE_PREFIX,QUIET_PREFIX,PRINT_ANCESTOR_PREFIX);

  printf("To print ancestor information, to file only, one can also call for fast usage with\n");
  printf("             dating infile.tree res_file\n");

  printf("...................................................................\n");
}
void print_help(){
  printf("\n");
  print_info();
  printf("\n\n\n");
  print_argument();
  printf("\n\n\n");
  print_examples();
  printf("\n\n\n");
  print_ouput_info();
  printf("\n\n\n");
  if( ! FIXAGE_MODE)
    print_table_info();
  printf("\n");
  exit(99);
}
/* .....................................................................-*/


#endif
