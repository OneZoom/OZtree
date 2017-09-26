///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Computes ages of input node and all its ancestors
///	\author	SL
///	\date	20051021
///	\test	No
///	\warning changed	Crashes if n==NULL
///////////////////////////////////////////////////////////////////////////////////////////
void compute_ages(node *n) {
  int i;
  segment *s;
  if (!is_terminal(n)) {
    if (is_root(n)) {
      s = create_segment(n);
      if (!is_fixnode(n)) {
	fix_root_age();
      }
      compute_segment(s);
    } else if (!n->fix->is_dated) {
      s = create_segment(n);
      compute_segment(s);
    }
    print_verbose(V_AGES,"Computing ages of %s -- %s to %f\n\n",get_terminal(n,LEFT)->name,get_terminal(n,RIGHT)->name,n->fix->calc_age);
    for (i = 0; i < n->num_of_children; i++) compute_ages(n->child[i]);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Compute ages in given segment
///	\author	SL
///	\date	20051021
///	\test	No
///     \warning NO LONGER CONTAINS A BUG IF THE ROOT NODE SEGMENT IS REDEFINED?
///////////////////////////////////////////////////////////////////////////////////////////
void compute_segment(segment *s) {
  print_verbose(V_COMPUTE_SEGMENT,"Computing segment of  %s <--> %s\n\n",get_terminal(s->root,LEFT)->name,get_terminal(s->root,RIGHT)->name);
  compute_segment_rec(s, s->root);
  if (!s->is_consistent) {
    reset_segment(s, s->root);
    s = create_segment(s->root);
    if (is_root(s->root) && s->root->fix->is_forced_fixnode == FALSE && is_fixnode(s->root) == FALSE) {
      fix_root_age();
    }
    compute_segment(s);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Forcing fixage of n to age
///	\author	SL
///	\date	20051021
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
void force_fixage(node *n, double age) {
  n->fix->fixage = age;
  n->fix->calc_age = age;
  n->fix->is_forced_fixnode = TRUE;
  n->fix->is_dated = TRUE;
  print_verbose(V_FORCE_FIXAGE,"Forcing fixage of %s <--> %s to %.f\n\n",get_terminal(n,LEFT)->name,get_terminal(n,RIGHT)->name,age);
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	For every inner node n in the segment s, a list of
///     all fixnodes lying in the intersection of s and the subtree 
///     defined by n is established. The maximal fixnode of these
///     fixnodes is calculated and also the number of free terminals for n. 
///	\author SL
///	\date	20051112
///	\test	No
///	\deprecate   
///     \warning CHANGED
///	\todo  Define a predicate is_innernode(node *n) = 
///     !is_terminal && !is_fixnode. Make a special case for the root node.
///    
///////////////////////////////////////////////////////////////////////////////////////////
void set_fixnodes(segment *s, node *n) {
  int i,j,index;
  if (!is_terminal(n) && (!is_fixnode(n) || (is_fixnode(n) && s->root == n))) {

    print_verbose(V_SET_FIXNODES,"Splitting with Segment %s <--> %s , node %s <--> %s\n",
		  get_terminal(s->root,LEFT)->name,get_terminal(s->root,RIGHT)->name,
		  get_terminal(n,LEFT)->name,get_terminal(n,RIGHT)->name);

    for (i = 0; i < n->num_of_children; i++) set_fixnodes(s, n->child[i]);
    n->fix->num_of_free_terminals = 0;
    n->fix->max_of_fixnodes = 0;
    n->fix->num_of_fixnodes = 0;
    for (i = 0; i < n->num_of_children; i++) {
      n->fix->num_of_free_terminals += n->child[i]->fix->num_of_free_terminals;
      n->fix->max_of_fixnodes = max(n->fix->max_of_fixnodes, n->child[i]->fix->max_of_fixnodes);
      n->fix->num_of_fixnodes += n->child[i]->fix->num_of_fixnodes;
    }
    n->fix->fixnodes = (node **) calloc(n->fix->num_of_fixnodes, sizeof(node *));
    index = 0;
    for (i = 0; i < n->num_of_children; i++) {
      for (j = 0; j < n->child[i]->fix->num_of_fixnodes; j++) {
	n->fix->fixnodes[index] = n->child[i]->fix->fixnodes[j];
	print_verbose(V_SET_FIXNODES_ALL,"\t %s <--> %s\n",
		      get_terminal(n->fix->fixnodes[index],LEFT)->name,
		      get_terminal(n->fix->fixnodes[index],RIGHT)->name);
	index++;
      }
    }
  } else if (is_terminal(n)) {
    n->fix->num_of_fixnodes = 0;
    n->fix->fixnodes = 0;
    n->fix->num_of_free_terminals = 1;
    n->fix->max_of_fixnodes = 0;
  } else if (is_fixnode(n)) {
    n->fix->num_of_fixnodes = 1;
    n->fix->fixnodes = (node **) calloc(1, sizeof(node *));
    n->fix->fixnodes[0] = n;
    n->fix->num_of_free_terminals = 0;
    n->fix->max_of_fixnodes = n->fix->fixage;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Creates segment with n as root
///	\author	SL
///	\date	20051021
///	\test	No
///	\warning
///	\todo
///////////////////////////////////////////////////////////////////////////////////////////
segment *create_segment(node *n) {
  print_verbose(V_CREATE_SEGMENT , "Creating segment of %s <--> %s\n\n",get_terminal(n,LEFT)->name,get_terminal(n,RIGHT)->name);
  segment *s = (segment *) calloc(1, sizeof(segment));
  s->is_consistent = TRUE;
  s->root = n;
  set_fixnodes(s, n);
  return s;
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Computes and sets root age of segment
///	\author	SL
///	\date	20501021
///	\test	No
///	\warning
///	\todo  
///////////////////////////////////////////////////////////////////////////////////////////
void compute_age_of_root_in_segment(segment *s) {
  node *n = s->root;
  n->fix->is_dated = TRUE;
  n->fix->calc_age = n->fix->fixage;
  if (is_minnode(n)) {   //This might happen if s->root == T->root
    if (n->fix->calc_age < n->fix->minage) { //If n i reset (so that n is both a
      force_fixage(n, n->fix->minage); // minnode and a fixnode, then > cannot happen
      s->is_consistent = FALSE;
    }
  }
  if (is_maxnode(n)) { //This might happen if s->root == T->root
    if (n->fix->calc_age > n->fix->maxage) { //If n i reset, then < cannot happen
      force_fixage(n, n->fix->maxage);
      s->is_consistent = FALSE;
    }
  }
  print_verbose(V_COMPUTE_ROOT_OF_SEGMENT , "Root age of %s <--> %s = %f\n\n",
		get_terminal(s->root,LEFT)->name , get_terminal(s->root,RIGHT)->name, n->fix->calc_age);
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Returning the oldes child of a node
///	\author	DJ
///	\date	20051101
///	\test	No
///	\warning CHANGED	Crashes if input node i terminal or NULL
///////////////////////////////////////////////////////////////////////////////////////////
double oldest_child(node *n){
  int i;
  double m;
  if( is_terminal(n) ){
    printf("oldest_child : Cannot determine oldest child if node is terminal\n");
    error("oldest_child", ERR_BUG);
  }
  for (i = 0; i < n->num_of_children; i++) {
    if (n->child[i]->fix->is_dated == FALSE) {
      printf("Cannot determine the oldest node when one of them is not dated\n");
      error("oldest_child" , ERR_BUG);
    }
  }
  m = 0; 
  for (i = 0; i < n->num_of_children; i++) m = max(m, n->child[i]->fix->calc_age);
  return m;
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Computes and sets calc_age of n
///	\author	SL
///	\date	20051021
///	\test	No
///	\warning	Crashes if s or n is NULL /uninitiallized
/// Should only be envoked by compute_segment_rec
///////////////////////////////////////////////////////////////////////////////////////////
void compute_age_of_inner_node_in_segment(segment *s, node *n) {
  int i;
  node *a, *b;
  double numerator,age_quote;
  int denominator;
  a = s->root;
  numerator = n->fix->num_of_free_terminals * a->fix->fixage;
  
  if( a->mpl_pos != 0) numerator *= (n->mpl_pos/a->mpl_pos); 
  denominator = n->fix->num_of_free_terminals;
  for (i = 0; i < n->fix->num_of_fixnodes; i++) {
    b = n->fix->fixnodes[i];
    age_quote = 1;
    if( a->mpl_pos != b->mpl_pos) age_quote = (n->mpl_pos - b->mpl_pos) / (a->mpl_pos - b->mpl_pos );
    numerator += b->num_of_terminals * (b->fix->fixage + (a->fix->fixage - b->fix->fixage) * age_quote);
    denominator += b->num_of_terminals;
  }
  n->fix->calc_age = numerator/((double) denominator);
  n->fix->is_dated = TRUE;
  n->fix->calc_age = min(n->fix->calc_age , n->mother->fix->calc_age);
  check_age_vs_fixnodes(n);

  print_verbose(V_COMPUTE_CALC_AGE_OF_NODE_IN_SEGMENT , "Age of %s <--> %s = %f / %d = %f\n\n",
		get_terminal(n,LEFT)->name , get_terminal(n,RIGHT)->name , numerator , denominator ,
		n->fix->calc_age);
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Checks that the age computed for n does not 
///     violate the maxage of the fixnodes in the subtree
///     defined by n. If so, it sets intermediate nodes to maxage. 
///	\author	SL
///	\date	20051111
///	\test	No
///	\warning  Should only be envoked by compute_age_of_inner_node_in_segment
///////////////////////////////////////////////////////////////////////////////////////////
void check_age_vs_fixnodes(node *n) {
  int i;
  node *a;
  if (n->fix->num_of_fixnodes > 0 && n->fix->calc_age < n->fix->max_of_fixnodes) {
    i = 0;
    while(n->fix->fixnodes[i]->fix->fixage != n->fix->max_of_fixnodes) {
      i++;
    }
    a = n->fix->fixnodes[i]->mother;
    a->fix->calc_age = n->fix->max_of_fixnodes;
    
    a->fix->is_dated = TRUE;
    while (a != n) {
      a = a->mother;
      a->fix->calc_age = n->fix->max_of_fixnodes;
      a->fix->is_dated = TRUE;
    }
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief Walks trough segment recursively
///	\author	SL
///	\date	20051021
///	\test	No
//	\warning CHANGED Crashes if s or n is NULL
///////////////////////////////////////////////////////////////////////////////////////////
void compute_segment_rec(segment *s, node *n) {
  int i;
  if (s->root == n) {
    compute_age_of_root_in_segment(s);
    for (i = 0; i < n->num_of_children; i++) compute_segment_rec(s, n->child[i]);
  } else if (!is_terminal(n) && !is_fixnode(n)) {
    if (!n->fix->is_dated) {
      compute_age_of_inner_node_in_segment(s, n);
    }
    if (is_minnode(n)) {
      if (n->fix->calc_age < n->fix->minage) {
	//printf("force: min is %f\n", n->fix->minage);
	force_fixage(n, n->fix->minage);
	s->is_consistent = FALSE;
      }
    }
    if (is_maxnode(n)) {
      if (n->fix->calc_age > n->fix->maxage) {
	//printf("force: max is %f\n", n->fix->maxage);
	force_fixage(n, n->fix->maxage);
	s->is_consistent = FALSE;
      }
    }
    for (i = 0; i < n->num_of_children; i++) compute_segment_rec(s, n->child[i]);
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	If a segment is inconsistent, all nodes within the segment
///     is updated, i.e. a forced fixage node will be a fixage node, and
///     calculated nodes are no longer regarded as calculated. Memory is
///     freed for the fixnodes. 
///     \author	SL
///	\date	20051021
///	\test No
///	\todo
///     \warning CHANGED
///////////////////////////////////////////////////////////////////////////////////////////
void reset_segment(segment *s, node *n) {
  int i;
  if (!is_terminal(n) && (!is_fixnode(n) || (is_fixnode(n) && s->root == n))) {
    for (i = 0; i < n->num_of_children; i++) reset_segment(s, n->child[i]);
    if (n->fix->is_forced_fixnode == TRUE) {
      n->fix->is_fixnode = TRUE;
    }
    n->fix->is_dated = FALSE;
    n->fix->calc_age = 0;
    free(n->fix->fixnodes);
    n->fix->fixnodes = 0;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Setting root fixage to its cal_cage
///	\author	Sl
///	\date	20051021
///	\test	No
///	\todo  check it!
///////////////////////////////////////////////////////////////////////////////////////////
void fix_root_age() {
  int i;
  node *b;
  double numerator;
  int denominator;
  numerator = 0;
  denominator = 0;

  for (i = 0; i < T->root->fix->num_of_fixnodes; i++) {
    b = T->root->fix->fixnodes[i];
    numerator += (b->num_of_terminals *
		  b->fix->fixage)* (T->root->mpl_pos/b->mpl_pos);
    denominator += b->num_of_terminals;
  }
  T->root->fix->calc_age = numerator/((double) denominator);
  check_age_vs_fixnodes(T->root);
  T->root->fix->fixage = T->root->fix->calc_age;
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Exits if input constraints are non consistent
///	\author	SL
///	\date	20051021
///	\test	No
///////////////////////////////////////////////////////////////////////////////////////////
void set_input_consistence(tree *T){
  if( is_input_consistent(T->root) == FALSE){
	printf("Given constraints are contradicting each other.\n");
    error("set_input_consistence" , ERR_CONS);
  }
  else{
    T->is_consistent = TRUE;
  }
}
///////////////////////////////////////////////////////////////////////////////////////////
///     \brief Checks redundant constraints. Updates if so. 
///     \author SL
///     \date   20051121
///     \test   no
///     \warning Slow function
///     \todo   
///     \warning CHANGED due to new directives 20060112
///////////////////////////////////////////////////////////////////////////////////////////
void update_constraints(node *n) {
  double max;
  double min;
  int i;
  if (is_terminal(n)) {
    return;
  }
  if (is_minnode(n)) {
    max =  max_of_min_constraints(n);
    if (n->fix->minage <= max) {
      n->fix->is_minnode = FALSE;
      NUM_MIN--;
    } 
  } 
  if (is_maxnode(n)) {
    min = min_of_max_constraints(n); 
    if (min != -1 && n->fix->maxage >= min) { //there is an older node with lower maxage
      n->fix->is_maxnode = FALSE;
      NUM_MAX--;
    }
  }
  for (i = 0; i < n->num_of_children; i++) update_constraints(n->child[i]);
}

///////////////////////////////////////////////////////////////////////////////////////////
///     \brief Checks redundant constraints 
///     \author SL
///     \date   20051121
///     \test   no
///     \warning CHANGED Slow function
///     \todo   
///////////////////////////////////////////////////////////////////////////////////////////
int contains_sound_constraints(node *n) {
  int i;
  if (is_terminal(n)) {
    return TRUE;
  }
   print_verbose(V_CREATE_SEGMENT , "Cotains sound constraints of %s <--> %s\n\n",get_terminal(n,LEFT)->name,get_terminal(n,RIGHT)->name);
  if (is_minnode(n)) {
    //printf("minval:%f\n", n->fix->minage);
    //printf("maxval:%f\n", n->fix->maxage);
    if (n->fix->minage <= max_of_min_constraints(n)) {
      return FALSE;
    } 
  } if (is_maxnode(n)) {
    if (n->fix->maxage >= min_of_max_constraints(n))
      return FALSE;
  }
  for (i = 0; i < n->num_of_children; i++)  {
    if (contains_sound_constraints(n->child[i]) == FALSE) {
      return FALSE;
    }
  }
  return TRUE;
}
/////////////////////////////////////////////////////////////////////////////////////////
///       \brief Gives the minimal max-constraints on subtree 
///       \author SL
///       \date 20051121
///       \test no
///       \warning CHANGED
///       \todo
/////////////////////////////////////////////////////////////////////////////////////////
double min_of_max_constraints(node *n) {
  double min_val = -1;
  if (n == T->root) return -1;
  n = n->mother;
  for(;;) {
    if (is_maxnode(n)) {
      if (min_val == -1 || min_val > n->fix->maxage) {
	min_val = n->fix->maxage;
      }
    }
    if (n == T->root) break;
    else n = n->mother;
  }
  return min_val;
}


/////////////////////////////////////////////////////////////////////////////////////////
///       \brief Gives the maximal min-constraints on subtree except n
///       \author SL
///       \date 20051121
///       \test no
///       \todo
/////////////////////////////////////////////////////////////////////////////////////////
double max_of_min_constraints(node *n) {
  double tmp;
  double max_val = -1;
  int i;
  if (is_terminal(n)) return -1;
  for (i = 0; i < n->num_of_children; i++) {
    if (is_minnode(n->child[i])) {
      tmp = n->child[i]->fix->minage;
      if (max_val == -1 || max_val < tmp) {
	max_val = tmp;
      }
    }
    tmp = max_of_min_constraints(n->child[i]);
    if (tmp != -1 && max_val < tmp) {
      max_val = tmp;
    }
  }
  return max_val;
}


///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Checks whether the input tree constraints to node are 
///      consistent. No calculations on tree has yet been performed!
///      This is step 1 in the algoritmic description 2003-04-17.
///	\author	SL
///	\date	20051021
///	\test	No
///	\todo return boolean
///     \warning CHANGED
///////////////////////////////////////////////////////////////////////////////////////////
int is_input_consistent(node *n) {
  int i;
  if (is_terminal(n)) {
    if( n->fix->is_minnode== TRUE || n->fix->is_maxnode== TRUE || n->fix->is_fixnode==TRUE){
	printf("Cannot set age constraints of terminal (name = %s)\n" , n->name);
      error("is_consistent" , ERR_FIXAGE_AGE);
	}
    return TRUE;
  } else if (is_maxnode(n)) {
    if (check_input_constraints_on_subtree(n, n->fix->maxage) == FALSE) {
      return FALSE;
    } else {
      for (i = 0; i < n->num_of_children; i++) {
	if (is_input_consistent(n->child[i]) == FALSE) {
	  return FALSE;
	}
      }
      return TRUE;
    }
  } else if (is_fixnode(n)) {
    if (check_input_constraints_on_subtree(n, n->fix->fixage) == FALSE) {
      return FALSE;
    } else {
      for (i = 0; i < n->num_of_children; i++) {
	if (is_input_consistent(n->child[i]) == FALSE) {
	  return FALSE;
	}
      }
      return TRUE;
    }
  } else {
    for (i = 0; i < n->num_of_children; i++) {
      if (is_input_consistent(n->child[i]) == FALSE) {
	return FALSE;
      }
    }
    return TRUE;
  }
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Checks whether input constraint say that node is younger
///     than one of its children
///	\author	SL
///	\date	20051021
///	\test	No
///     \warning CHANGED
///	\todo return Boolean
/// Should only be envoked by is_input_consistent
///////////////////////////////////////////////////////////////////////////////////////////
int check_input_constraints_on_subtree(node *n, double maxage) {
  int i;
  if (is_terminal(n)) {
    return TRUE;
  } else if (is_fixnode(n)) {
    if (n->fix->fixage > maxage) {
      return FALSE;
    } else {
      for (i = 0; i < n->num_of_children; i++) {
	if (check_input_constraints_on_subtree(n->child[i], maxage) == FALSE) {
	  return FALSE;
	} 
      }
      return TRUE;
    }
  } else if (is_minnode(n)) {
    if (n->fix->minage > maxage) {
      return FALSE;
    } else {
      for (i = 0; i < n->num_of_children; i++) {
	if (check_input_constraints_on_subtree(n->child[i], maxage) == FALSE) {
	  return FALSE;
	} 
      }
      return TRUE;
    }
  } else {
    for (i = 0; i < n->num_of_children; i++) {
      if (check_input_constraints_on_subtree(n->child[i], maxage) == FALSE) {
	return FALSE;
      } 
    }
    return TRUE;
  }
}

int is_minnode(node *n) {
  return n->fix->is_minnode;
}

int is_maxnode(node *n) {
  return n->fix->is_maxnode;
}

int is_fixnode(node *n) {
  return n->fix->is_fixnode;
}

int is_forced_fixnode(node *n) {
  return n->fix->is_forced_fixnode;
}

///////////////////////////////////////////////////////////////////////////////////////////
///	\brief	Sets mpl - data for n ats its ancestors
///	\author
///	\return
///	\date
///	\test
//	\warning
///	\todo
///     \warning CHANGED
/// 	Equals build_tree except it ignorences nominator_of_var and var
/// 	and declares memory for the fix-part
///////////////////////////////////////////////////////////////////////////////////////////
void set_tree(node *n) {
  int i;
  if (is_terminal(n)) {
    n->num_of_terminals = 1;
    n->sum_of_paths = 0;
    n->mpl = 0;
  } else {
    for (i = 0; i < n->num_of_children; i++) set_tree(n->child[i]);
    n->num_of_terminals = 0;
    n->sum_of_paths = 0;
    for (i = 0; i < n->num_of_children; i++) {
      n->num_of_terminals += n->child[i]->num_of_terminals;
      n->sum_of_paths = n->child[i]->sum_of_paths +
	n->edge_len[i] * n->child[i]->num_of_terminals;
    }
    n->mpl = n->sum_of_paths / n->num_of_terminals;
  }
}



char is_child(node *old , node *young){
  //if(old == null || young == null)
  //  error()

  if( young->mother == old)
    return TRUE;
  else if(young->mother == NULL)
    return FALSE;
  else
    return is_child(old , young->mother);

}

node *mrca(node *ch1 , node *ch2){
  if( is_child(ch1,ch2) )
    return ch1;
  else if( is_child(ch2,ch1) )
    return ch2;
  else
    return mrca(ch1->mother , ch2);
}
///////////////////////////////////////////////////////////////////////////////////////////
///     \brief  Remove all constrains on tree
///     \author SL
///     \date   20060319
///     \test   No
///     \todo   After call, check that NUM_FIX, NUM_MIN & NUM_MAX == 0
///////////////////////////////////////////////////////////////////////////////////////////

void remove_all_constraints(node *n) {
  int i;
  if (!is_terminal(n)) {
    if (is_fixnode(n))  NUM_FIX--;
    if (is_minnode(n)) NUM_MIN--;
    if (is_maxnode(n)) NUM_MAX--;
    n->fix->is_fixnode = FALSE;
    n->fix->is_minnode = FALSE;
    n->fix->is_maxnode = FALSE;
    
    for (i = 0; i < n->num_of_children; i++) {
      remove_all_constraints(n->child[i]);
    }
  }
}
