


double chival2prob(int dgf, double val){
	return gammq((double)dgf/(double)2,val/(double)2);
}
double prob2chival(int dgf, double prob){
	double p , min , max , val;
	min = 0;
	max = 1;
	if( prob < 0 || prob > 1 ){
	  error("prob2chival", ERR_BUG);
	}
	while ( chival2prob(dgf , max) > prob ) {
	  max *= 2;
	}
	while ( max - min > 2*CHI_VAL_ACCURACY ){
	  val = (max+min)/(double)2;
	  p = chival2prob(dgf,val);
	  if( p < prob )
	    max = val;
	  else
	    min = val;
	}
	return (min+max)/(double)2;
}


double normval2prob(double val){
	return chival2prob(1 , val*val);
}
double prob2normval(double prob){
	return sqrt( prob2chival(1,prob) );
}


