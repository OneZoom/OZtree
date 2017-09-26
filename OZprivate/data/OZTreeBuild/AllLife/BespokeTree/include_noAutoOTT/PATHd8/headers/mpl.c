
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Calloccates memory for node and sets some members
///	\author	David Jacquet
///	\date	20051021
///	\test	No
///	\warning	Must be expanded if struct node is expanded CHANGED
///////////////////////////////////////////////////////////////////////////////////////////
node * create_node(int num_of_children){
  node *n;
  n = (node *)calloc(1,sizeof(node));
  n->num_of_children = num_of_children;
  if (num_of_children == 0) {
    n->child = NULL;
    n->edge_len = NULL;
    n->edge_pos = NULL;
    n->edge_est = NULL;
  } else {
    n->child = (node **) calloc(num_of_children, sizeof(node *));
    n->edge_len = (double *) calloc(num_of_children, sizeof(double));
    n->edge_pos = (double *) calloc(num_of_children, sizeof(double));
    n->edge_est = (double *) calloc(num_of_children, sizeof(double));
  }
  n->fix = (fixage_data *) calloc(1, sizeof(fixage_data));
  n->fix->is_fixnode = FALSE;
  n->fix->is_minnode = FALSE;
  n->fix->is_maxnode = FALSE;
  n->fix->is_dated = FALSE;

  return n;

}


int is_root(node *n) {
  return (n == T->root);
}
//changed
int is_terminal(node *n) {
  return (n->child == NULL);
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  checks wether tree is binary
///	\author	SL
///	\date	20051128
///	\test	No
///     \todo   
///	\warning  
///////////////////////////////////////////////////////////////////////////////////////////
int is_binary(node *n) {
  if (is_terminal(n)) return TRUE;
  if (n->num_of_children != 2) return FALSE;
  return (is_binary(n->child[0]) && is_binary(n->child[1]));
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  find node in subtree 
///	\author	DJ
///	\date	20051021
///	\test	No
///     \todo   remove variable find, clean the double return statement
///	\warning changed 2005-11-28  
///////////////////////////////////////////////////////////////////////////////////////////
char find_node( char *name, node *root, node **n){
  int i;
  char find;
  find = FALSE;
  // printf("seeking %s, from %s\n",name,root->name);
  if(name != NULL && root->name != NULL && strcmp(name, root->name) == 0) {
    *n = root;
    return TRUE;
  } else if(! is_terminal(root) ){
    for (i = 0; i < root->num_of_children; i++){
      if (find_node(name, root->child[i], n) == TRUE) return TRUE;
    }
    return FALSE;
  } else {
    return FALSE;
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  build tree recursively
///	\author	SL
///	\date	200504??
///	\test	No
///	\warning changed 2005-11-28  
///////////////////////////////////////////////////////////////////////////////////////////
void build_tree(node *n) {
  int i;
  if (is_terminal(n)) {
    n->num_of_terminals = 1;
    n->sum_of_paths = 0;
    n->mpl = 0;
    n->nominator_of_var = 0;
    n->var = 0;
  } else {
    for (i = 0; i < n->num_of_children; i++) build_tree(n->child[i]);
    n->num_of_terminals = 0;
    n->sum_of_paths = 0;
    n->nominator_of_var = 0;
    for (i = 0; i < n->num_of_children; i++) {
      n->num_of_terminals += n->child[i]->num_of_terminals;
      n->sum_of_paths += n->child[i]->sum_of_paths + 
	n->edge_len[i] * n->child[i]->num_of_terminals; 
      n->nominator_of_var += n->child[i]->nominator_of_var + 
	n->child[i]->num_of_terminals * n->child[i]->num_of_terminals * n->edge_len[i]; 
    }
    n->mpl = n->sum_of_paths / n->num_of_terminals;
    n->var = n->nominator_of_var/(n->num_of_terminals*n->num_of_terminals);
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  compute the estimated edges 
///	\author	SL
///	\date	200504??
///	\test	No
///	\warning changed 2005-11-28   probably ok with only one iteration 
///////////////////////////////////////////////////////////////////////////////////////////
void compute_est_edges(node *n, double adj) {
  int i;
  if (!is_terminal(n)) {
    for (i = 0; i < n->num_of_children; i++) {
      /* set step */
      n->edge_est[i] = n->mpl - n->child[i]->mpl;
      if (n->edge_est[i] < 0) {
	T->num_of_neg++;
      } else {
	T->num_of_pos++;
      }
    }
    for (i = 0; i < n->num_of_children; i++) {
      /* adjust step */
      n->edge_est[i] += adj; 
      if (n->edge_est[i] < 0) {
	 n->edge_pos[i] = (double)0;
	 compute_est_edges(n->child[i], n->edge_est[i]); //need to adjust the child
      } else {
	n->edge_pos[i] = n->edge_est[i];
	compute_est_edges(n->child[i], (double)0);
      }
    }
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  Compute mpl pos
///	\author	DJ
///	\date	200511??
///	\test	No
///	\warning changed 2005-11-28   changed  isnt mpl_pos = mpl?
///////////////////////////////////////////////////////////////////////////////////////////
void compute_mpl_pos(node *n){
  int i;
  if (is_terminal(n)) {
    n->sum_of_pos_paths = 0;
    n->mpl_pos = 0;
  } else {
    for (i = 0; i < n->num_of_children; i++) compute_mpl_pos(n->child[i]);
    n->sum_of_paths = 0; 
    for (i = 0; i < n->num_of_children; i++) {
      n->sum_of_pos_paths += 	n->child[i]->sum_of_pos_paths +
	n->edge_pos[i] * n->child[i]->num_of_terminals;
    }
    n->mpl_pos = n->sum_of_pos_paths / n->num_of_terminals;
  }
}

void build_and_calc_tree(node *n){
  build_tree(n);
  compute_est_edges(n,(double) 0);
  compute_mpl_pos(n);
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief  Statistical test
///	\author	SL
///	\date	200504??
///	\test	No
///	\warning changed 2005-12-08 subtree_var & subtree_est used only for clean code
///////////////////////////////////////////////////////////////////////////////////////////

void test(node *n) {
  int i;
  double p_bar, p_bar_numerator, p_bar_denominator;
  double *subtree_var, *subtree_est;
  node *lt, *rt;
  
  if (!is_terminal(n)) {
    subtree_est = calloc(n->num_of_children, sizeof(double));
    subtree_var = calloc(n->num_of_children, sizeof(double));
    for (i = 0; i < n->num_of_children; i++) {
      subtree_est[i] = n->child[i]->mpl + n->edge_len[i];
      subtree_var[i] =  n->child[i]->var + n->edge_len[i];
    }
    p_bar_numerator  = 0;
    p_bar_denominator =0;
    for (i = 0; i < n->num_of_children; i++) {
      p_bar_numerator += subtree_est[i]/subtree_var[i];
      p_bar_denominator += 1/subtree_var[i];
    }
    p_bar = p_bar_numerator/p_bar_denominator;
    
    n->chi_sq = 0;
    for (i = 0; i < n->num_of_children; i++) {
      n->chi_sq += (subtree_est[i] - p_bar)*(subtree_est[i] - p_bar) / subtree_var[i];
    }
    
    n->prob = chival2prob(n->num_of_children-1, n->chi_sq);
    
    if( VERBOSE == TRUE ){
      lt = get_terminal(n,LEFT);
      rt = get_terminal(n,RIGHT);
      dprint(RES_FILE, "verbose information for the test needs to be rewritten.\n");
      // dprint(RES_FILE,"\nTESTING : node anc. of (%s , %s) and with ll = %f, rl = %f, lc = %s, rc = %s\n",
      //     lt->name,rt->name,n->left_edge_len,n->right_edge_len,n->left->name,n->right->name);
      //dprint(RES_FILE,"var1:%f\n", var1);
      //dprint(RES_FILE,"var2:%f\n", var2);
      //dprint(RES_FILE,"var :%f ==> confidence intervall [+/- %f]\n", var,prob2value(PROB_LIMIT)*sqrt(var));
      //dprint(RES_FILE,"diff ~N(%f,%f) takes value : %f\n",(double)0,var,diff);
    }
    free(subtree_est);
    free(subtree_var);
  }
  if( n->prob < 1-PROB_LIMIT ) {
    
    n->accepted = FALSE;
    T->num_of_rejected++;
    if( VERBOSE == TRUE ){
      dprint(RES_FILE,"REJECT, n->chi_sq = %f ==> prob = %f (>%f)\n", n->chi_sq,n->prob,PROB_LIMIT);
    }
  } else {
    n->accepted = TRUE;
    T->num_of_accepted++;
    if( VERBOSE == TRUE ){
      dprint(RES_FILE,"ACCEPT, n->chi_sq = %f ==> prob = %f  (<%f)\n", n->chi_sq,n->prob,PROB_LIMIT);
    }
  }
  for (i = 0; i < n->num_of_children; i++) {
    if (!is_terminal(n->child[i])) {
      test(n->child[i]);
    }
  }
}
