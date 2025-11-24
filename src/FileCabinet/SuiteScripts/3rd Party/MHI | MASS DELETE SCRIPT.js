/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 */
define(['N/search', 'N/record'], function(search, record) {
​
    function getInputData() {
        return search.load('customsearch952')
    }
​
    function map(context) {
        var recid = context.key;
        var ctx = JSON.parse(context.value);
        record.delete({
           type: ctx.recordType,
           id: recid
       });
    }
​
  	 return {
        getInputData: getInputData,
        map: map,
    }
});