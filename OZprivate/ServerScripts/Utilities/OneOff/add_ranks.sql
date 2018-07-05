UPDATE `ordered_leaves` set popularity_rank = NULL;

SET @curRank := 1;
SET @_sequence:=1;
SET @_last_pop:=0;

UPDATE `ordered_leaves` dest, (SELECT id, 
	IF(popularity=@_last_pop,@curRank:=@curRank,@curRank:=@_sequence) AS pop_rank,
    @_sequence:=@_sequence+1,@_last_pop:=popularity FROM `ordered_leaves` ol, (SELECT @curRank := 1, @_sequence:=1, @_last_pop:=0) r
ORDER BY popularity DESC) src set dest.`popularity_rank` = src.pop_rank where dest.id = src.id;
