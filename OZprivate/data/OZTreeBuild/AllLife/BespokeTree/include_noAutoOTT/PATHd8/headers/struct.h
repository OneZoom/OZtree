#ifndef STRUCTH
#define STRUCTH

/* ---------  C O N S T A N T S  ----------------------------------------*/
#define TRUE  1
#define FALSE 0

#define RELAXED_MODE 0
#define NORMAL_MODE  1
#define STRICT_MODE  2

#define NUM_OF_FAST_ARGS 2
#define IS_ADVANCED FALSE

#define SYM_COLON           ':'
#define SYM_RIGHT           ')'
#define SYM_LEFT            '('
#define SYM_COMMA           ','
#define SYM_COMMENT         '#'
#define SYM_BLANK           ' '
#define SYM_EQUAL           '='
#define SYM_END             ';'
#define SYM_COMMENT_LEFT    '['
#define SYM_COMMENT_RIGHT   ']'

#define MRCA_WORD               "mrca"
#define SEQUENCE_LENGTH_WORD    "Sequence length"
#define NAMING_WORD             "Name of mrca"
#define NAMING_KEY              "Name"


#define LEFT 0
#define RIGHT 1


#define ERR_FORMAT   0
#define ERR_FILE     1
#define ERR_SYM      2
#define ERR_ARG      3
#define ERR_FAST_ARG 4
#define ERR_FIXAGE   5
#define ERR_FIXAGE_AGE 6
#define ERR_CONS 7
#define ERR_NO_FIXAGE 8
#define ERR_NAMES     9
#define ERR_NUM_FORMAT 10
#define ERR_BUG 11

#define PM_INPUT 0
#define PM_NONEG 1
#define PM_FINAL 2
#define PM_FIXAGE 3
#define PM_MPLIN 4
#define PM_MPL 5
#define PM_MPLPOS 6
#define PM_MPLD8 7


#define REJ_WORD "Rej"
#define ACC_WORD "Acc"
#define NEG_SYM "N"

#define V_AGES 10
#define V_COMPUTE_SEGMENT 10
#define V_FORCE_FIXAGE 5
#define V_SET_FIXNODES 10
#define V_SET_FIXNODES_ALL 15
#define V_CREATE_SEGMENT 5
#define V_COMPUTE_ROOT_OF_SEGMENT 5
#define V_COMPUTE_CALC_AGE_OF_NODE_IN_SEGMENT 5
#define V_READ 5
#define V_DBG_READ 10


#define STAT_MISSING "XX"

/* ----------------------------------------------------------------------*/



/* ---------  M O D E S -------------------------------------------------*/
int FIXAGE_MODE =FALSE;
/* ----------------------------------------------------------------------*/



/* ---------  A R G U M E N T S  ----------------------------------------*/
#define HELP_PREFIX           "-h"
#define VERBOSE_PREFIX        "-v"
#define NEWICK_FILE_PREFIX    "-n"
#define RES_FILE_PREFIX       "-r"
#define TABLE_PREFIX          "-t"
#define PRINT_ANCESTOR_PREFIX "-pa"
#define PRINT_NEWICK_PREFIX   "-pn"
#define QUIET_PREFIX          "-q"
#define CONFIDENCE_PREFIX     "-c"
#define MANY_FILES_PREFIX     "-f"
int HELP_MODE            = NORMAL_MODE;
int VERBOSE_MODE         = NORMAL_MODE;
int NEWICK_FILE_MODE     = NORMAL_MODE;
int RES_FILE_MODE        = NORMAL_MODE;
int TABLE_MODE           = NORMAL_MODE;
int PRINT_ANCESTOR_MODE  = NORMAL_MODE;
int PRINT_NEWICK_MODE    = NORMAL_MODE;
int QUIET_MODE           = NORMAL_MODE;
int CONFIDENCE_MODE      = NORMAL_MODE;
int MANY_FILES_MODE    = NORMAL_MODE;
#define HELP_EXPL             "Print help"
#define VERBOSE_EXPL          "Print verbose of information"
#define NEWICK_FILE_EXPL      "The arg. file, must be on (extended) Newick format"
#define RES_FILE_EXPL         "The ouput result file"
#define TABLE_EXPL            "Uses given, instead of included, norm. dist. table"
#define PRINT_ANCESTOR_EXPL   "Print ancestor information"
#define PRINT_ANCESTOR_EXPL   "Print ancestor information"
#define PRINT_NEWICK_EXPL     "Print result on Newick like format"
#define QUIET_EXPL            "Quiet, no stdout prints"
#define CONFIDENCE_EXPL       "Set new confidence probability"
#define MANY_FILES_EXPL       "Create many files"
/* ----------------------------------------------------------------------*/


// SL 20050620
/* -------  M A C R O S  ------------------------------------------------*/
#define max(a,b) ((a) > (b) ? (a):(b))
#define min(a,b) ((a) < (b) ? (a):(b))


/* -------  D A T A  T Y P E S  -----------------------------------------*/

// SL 20050515
struct _fixage_data {
  double calc_age;		/// Calculated age by algoritm
  double fixage;		/// Fixage Constrant
  double minage;		/// Minage Constraint
  double maxage;		/// Maxage Constraint
  int num_of_free_terminals; 	/// Number of terminals without passing fixage
  int is_forced_fixnode;	/// TRUE if the node is set due to violating constraints
  int is_fixnode;		/// TRUE if the node is a fixnodes in the constraints
  int is_minnode;		/// TRUE if the node is a minnodes in the constraints
  int is_maxnode;		/// TRUE if the node is a maxnodes in the constraints
  int is_dated;  		/// True if calc_age is set and node is part of a consistent segment
  int num_of_fixnodes;		/// len of fixnodes
  double max_of_fixnodes;	/// Oldest of fixnodes
  struct _node **fixnodes;	/// Fixnodes below n : there is no other fixnode in between
};

struct _node {
  char *name;
  struct _node **child;         /// pointing to children
  double *edge_est;             /// Diff of mpl of node and child, possibly < 0
  double *edge_len;             /// Input edge len
  double *edge_pos;             /// Diff of changed mpl of node and child, >= 0
  int num_of_children;

  struct _node *mother;		/// Pointing to its mother or NULL if root
  struct _fixage_data *fix; 	/// Poiting to the fixage data structure SL 20050515

  int num_of_terminals;		/// Number of terminals under the node
  double sum_of_paths;
  double sum_of_pos_paths;
  double mpl;
  double mpl_pos;
  double nominator_of_var;
  double var;

  //double z;
  double chi_sq;
  double prob;

  int accepted;
};

//SL 20050515
struct _segment {
  struct _node *root;
  int is_consistent;
};

struct _tree {
  struct _node *root;
  int num_of_pos;
  int num_of_neg;
  int num_of_rejected;
  int num_of_accepted;
  int is_consistent;
};


typedef struct _tree tree;
typedef struct _node node;

//SL 20050620
typedef struct _segment segment;
typedef struct _fixage_data fixage_data;
/* ----------------------------------------------------------------------*/




/* -------  V A R I A B L E S  ------------------------------------------*/
char *R8S_FIX          = "fixage";
char *R8S_MIN          = "minage";
char *R8S_MAX          = "maxage";

int EDGE_LENS_ARE_INTEGERS = TRUE;
int SEQUENCE_LENGTH_EXIST  = FALSE;

int NUM_MIN = 0;
int NUM_MAX = 0;
int NUM_FIX = 0;

char *NEWICK_FILE_NAME = NULL;
char *MPLIN_FILE_NAME  = NULL;
char *MPL_FILE_NAME    = NULL;
char *MPLPOS_FILE_NAME = NULL;
char *MPLD8_FILE_NAME  = NULL;
char *RES_FILE_NAME    = NULL;
char *TABLE_FILE_NAME  = NULL;

FILE *NEWICK_FILE      = NULL;
FILE *RES_FILE         = NULL;
FILE *TABLE_FILE       = NULL;
FILE *MPLIN_FILE       = NULL;
FILE *MPL_FILE         = NULL;
FILE *MPLPOS_FILE      = NULL;
FILE *MPLD8_FILE       = NULL;

char QUIET             = FALSE;
char VERBOSE           = FALSE;
char PRINT_ANCESTOR    = FALSE;
char PRINT_NEWICK      = FALSE;


double PROB_LIMIT       = 0.95;
double CHI_VAL_ACCURACY = 0.01;
double SEQUENCE_LENGTH  = 1;

tree *T;
/* ----------------------------------------------------------------------*/

#endif
