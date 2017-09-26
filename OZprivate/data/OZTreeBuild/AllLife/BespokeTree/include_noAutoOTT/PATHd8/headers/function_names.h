#ifndef FUNCTION_NAMESH
#define FUNCTION_NAMESH

//#include "arguments.c"

//#include "MPL.c"
node * create_node(int num_of_children);
int is_root(node *n) ;
int is_binary(node *n);
char find_node( char *name, node *root, node **n);
void build_tree(node *n);
void compute_est_edges(node *n, double adj);
void compute_mpl_pos(node *n);
void build_and_calc_tree(node *n);
void test(node *n);


//#include "io_basics.c"
FILE * open_file(char *file_name,const char *handle);
void print_verbose (int limit , const char *format, ...);
int dprint (FILE *file,const char *format, ...);
node * get_terminal(node *n,char dir);
char* check_name_syntax(char *name);
double check_double_syntax(const char *len);
double check_edge_len_syntax(const char *len);
char is_blank(char tmp);

//#include "input.c"
int file_len(char *file_name);
char is_key_sym(char c);
void srdd_by_keys(char *str, int len, int pos, char *left,char *right);
void remove_blanks(char *str, int *len );
char *file2str(char *file_name , int *len);
int num_of_syms(char *str , int len , char sym);
int letters2sym(char *str,int len ,  int start, char sym);
char *create_and_fill(char *big_str, int big_len , int start, int len);
char * read_str_to_sym(char *str, int len , int *start, char sym);
char next_delimiter(char *str, int len,int start);
char sym_exists(char *str, int len, int start ,char sym);
void divide_str(char *big_str   ,  int big_len,
		char **tree_str ,  int *tree_len,
		char **seq_str   , int *seq_len,
		char ***mrca_str,  int **mrca_len, int *num_mrca,
		char ***name_str,  int **name_len, int *num_name);
int num_children(char *str, int len, int pos);
int readT_str(char *str , int len,int pos, node **root, node *n,int child_nr) ;
void fill_fixage_data(node *n,char *name1,char *name2,char *text,double age) ;
void fill_fixage_from_str(char *str,int len, node *root);
void fill_fixage(char **mrca_str,int len, int *mrca_len,node *root);
void fill_seq_len(char *str, int len);
node * read_newick(char *file_name);
void minmax_equals_warning(char *name1, char *name2, double age);
void minmax_node_error(char *name1, char *name2, double minage, double maxage);
void double_minmax_warning(char *name1, char *name2, char *type, double new_age);
void fix_and_minmax_node_warning(char *name1, char *name2, char *type, double new_age);
void contradicting_node_error(char *name1, char *name2, char *old_type, double old_age, char *new_type, double new_age);

void fill_name_data(node *n,char *name1, char *name2, char *new_name);
void fill_name(char **name_str, int len, int *name_len, node *root);
void fill_name_from_str(char *str,int len, node *root);


//#include "output.c"
void error(char *function , int code);
void print_fixage_data(node *n);
void print_node_line( node *n, char print_mode );
void print_nodes_rec(node *root,node *n, char print_mode);
void print_nodes(node *node,char print_mode);
void print_ancestor_line(node *n);
void print_ancestor(node *n);
void print_ancestor_age_line(node *n);
void print_ancestor_age(node *n);
void print_result();
void print_info();
void print_ouput_info();
void print_table_info();
void print_argument_line(char *prefix , char *expl , int mode);
void print_argument();
void print_examples();
void print_help();
/* .....................................................................-*/




//#include "gamma_function.c"


//#include "stat.c"
double chival2prob(int dgf, double val);
double prob2chival(int dgf, double prob);
double normval2prob(double val);
double prob2normval(double prob);




//#include "d8.c"
void compute_ages(node *n);
void compute_segment(segment *s);
void force_fixage(node *n, double age);
void set_fixnodes(segment *s, node *n);
segment *create_segment(node *n);
void compute_age_of_root_in_segment(segment *s);
double oldest_child(node *n);
void compute_age_of_inner_node_in_segment(segment *s, node *n);
void check_age_vs_fixnodes(node *n);
void compute_segment_rec(segment *s, node *n);
void reset_segment(segment *s, node *n);
void fix_root_age();
void set_input_consistence(tree *T);void update_constraints(node *n);
int contains_sound_constraints(node *n);
double max_of_min_constraints(node *n);
double min_of_max_constraints(node *n);
int is_input_consistent(node *n) ;
int check_input_constraints_on_subtree(node *n, double maxage) ;
int is_minnode(node *n);
int is_maxnode(node *n);
int is_fixnode(node *n);
int is_forced_fixnode(node *n);
void set_tree(node *n);
char is_child(node *old , node *young);
node *mrca(node *ch1 , node *ch2);
void remove_all_constraints(node *n);



//#include "meta.c"
void run_mpl(/*int argc , char **argv*/);
void run_mpl_fix(/*int argc , char **argv*/);

#endif
