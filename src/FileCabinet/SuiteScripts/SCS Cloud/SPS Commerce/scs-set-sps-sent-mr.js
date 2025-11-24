/**
 *
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(['N/search', 'N/record', 'N/error', 'N/runtime'],
  
  /**
   *
   * @param {search} search
   * @param {rec} rec
   * @param {error} error
   * @param {runtime} runtime
   * @returns {{getInputData: ((function(): *[])|*), summarize: summarize, map: map}}
   */
  (search, rec, error, runtime) => {
    
    /**
     *
     * @param getInputData
     * @returns {*[]}
     */
    const getInputData = () => {
      
      log.debug('begin running getInputData function');
      
      // Parse input parameters
      var script = runtime.getCurrentScript();
      var savedSearchId = script.getParameter('custscript_ccc_resave_search');
      
      if (savedSearchId) {
        return search.load({
          id: savedSearchId
        });
      }
      
      return false;
    }
    
    /**
     *
     * @param context
     */
    const map = context => {
      
      var results = JSON.parse(context.value);
      
      log.debug('begin running map function', 'Processing Record ID: ' + results.id + ' | Record Type: ' + results.recordType);
      
      const record = rec.load({
        type: results.recordType,
        id: results.id
      });


      record.setValue({ fieldId: 'custbody_ccc_sps_sent', value: true });

      record.save({
        enableSourcing: false,
        ignoreMandatoryFields: true
      });
    }
    
    /**
     * This function logs all errors and the final results of the execution.
     *
     * @param {*} summary
     */
    const summarize = summary => {
      
      log.debug('summary', JSON.stringify(summary));
      
      if (summary.inputSummary.error) {
        log.error('input error', summary.inputSummary.error);
        
        summary.mapSummary.iterator().each(function(key, value) {
          log.error(key, JSON.parse(value).message);
          
          return true;
        });
        
        summary.reduceSummary.iterator().each(function(key, value) {
          log.error(key, JSON.parse(value).message);
          
          return true;
        });
      }
      
      log.audit('Usage Consumed', summary.usage);
      log.audit('Concurrency Number ', summary.concurrency);
      log.audit('Number of Yields', summary.yields);
    }
    
    return {
      getInputData: getInputData,
      map: map,
      summarize: summarize
    };
  });
