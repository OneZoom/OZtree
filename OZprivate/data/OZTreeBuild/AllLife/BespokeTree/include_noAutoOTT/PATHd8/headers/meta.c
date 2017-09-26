

void run_mpl(/*int argc , char **argv*/){

  FIXAGE_MODE     = FALSE;
  TABLE_MODE      = NORMAL_MODE;
  HELP_MODE       = NORMAL_MODE;
  CONFIDENCE_MODE = NORMAL_MODE;
 


  //  compute_est_edges(T->root, (double)0);
  if (is_binary(T->root)) {
    test(T->root);
  } else {
    //dprint(RES_FILE,"Tree is not binary. We try a test:\n");
    test(T->root);
  }
  print_result();

}

void run_mpl_fix(/*int argc , char **argv*/){

  FIXAGE_MODE     = TRUE;
  TABLE_MODE      = RELAXED_MODE;
  HELP_MODE       = RELAXED_MODE;
  CONFIDENCE_MODE = RELAXED_MODE;
  if(NUM_FIX==0){
    dprint(RES_FILE , "\n\nNo fixnodes were defined in \n\n\t\t        %s\n\nAny user given constraint is ignored and root age is fixed to 1\n\n", 	NEWICK_FILE_NAME);
    remove_all_constraints(T->root);
    fill_fixage_data(T->root,NULL,NULL,R8S_FIX,1.0);
  }
  if(NUM_FIX > 0 ){
    set_input_consistence(T);
    if (contains_sound_constraints(T->root) == TRUE) {
      //printf("sound\n");
    } else {
      //error("run_mpl_fix", ERR_FORMAT);
      //exit(1);
      //printf("Warning, there is unsoundness in min/max-data. Constraints are updated.\n");
      update_constraints(T->root);
    }
    //print_result();
    //print_nodes(T->root, PM_INPUT);
    compute_ages(T->root);
    print_result();

  }
}
