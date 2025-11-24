/**
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 * @NScriptType MapReduceScript
 * @author Michael Tzeng
 *
 * This is a one time script to be run for cleanup purposes.
 * Chefman has Open invoices with return items that don't have credit memos yet applied.
 * This script will process these in bulk.
 *
 * Version      Author      Date        Description
 * 1.0          mtzeng      5/15/25     Initial
 */
define(['N/search', 'N/record'],
  
  /**
   * @param {search} search
   * @param {record} record
   * @return {{
   *   getInputData: Function,
   *   map: Function,
   *   reduce?: Function,
   *   summarize?: Function,
   * }}
   */
  (search, record) => {
    
    
    /**
     * @type {string} HRCReferenceFieldId
     */
    const HRCReferenceFieldId = 'custbody_hrc_reason_code_desc';
    
    const c2foItemId = '60926'  // SBX: 60926
    const returnItemId2 = '60545' // SBX: 60545
    const OPEN_INVOICE_HRC_REF_SEARCH = 'customsearch_ccc_open_invoices_w_hrc_ref';
    
    /**
     * @param {GetInputContext} context
     * @return {GetInputReturn}
     */
    const getInputData = context => {
      try {
        log.audit('Started', 'Started');
        log.audit('getInputData', context);
        
        /**
         * @type {search.Search}
         */
        const openInvoicesSearch = search.load({id: OPEN_INVOICE_HRC_REF_SEARCH});
        /**
         * @type {search.PagedData}
         */
        const openInvoicesSearchPagedResults = openInvoicesSearch.runPaged();
        
        const dataArr = [];
        
        openInvoicesSearchPagedResults.pageRanges.forEach(function(pageRange){
          const myPage = openInvoicesSearchPagedResults.fetch({index: pageRange.index});
          myPage.data.forEach(function(result){
            dataArr.push({
              id: result.id
            })
          });
        })
        log.debug("dataArr.length", dataArr.length)
        return dataArr;
        
      } catch (e) {
        log.error('getInputData', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
      }
    };
    
    /**
     * @param {MapContext} context - Data collection containing raw key/value pairs
     * @return {void}
     */
    const map = context => {
      try {
        // log.audit('map', context);
        const {key, value} = context;
        const val = JSON.parse(value);
        
        const invoiceId = val.id;
        log.debug("invoiceId", invoiceId);
        handleAutoCreateApplyCreditMemo(invoiceId)
        
      } catch (e) {
        log.error('map', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
      }
    };
    
    const handleAutoCreateApplyCreditMemo = (recordId) => {
      // const {type, newRecord, oldRecord} = context;
      // if (![context.UserEventType.CREATE].includes(type)) return;
      
      const newRecord = record.load({
        type: record.Type.INVOICE,
        id: recordId
      })
      
      /**
       * @type {string} hrcReference
       */
      const hrcReference = (newRecord.getValue({fieldId: HRCReferenceFieldId})??'')+'';
      log.debug("hrcReference", hrcReference);
      
      if (!hrcReference) return;
      
      
      /**
       * @type {string} numItems
       */
      const numItems = (newRecord.getLineCount({sublistId: 'item'})??'')+'';
      
      /**
       * @type {[]}
       */
      const arrReturns = [];
      
      for (let i=0; i<numItems; i++){
        /**
         * @type {string} item
         */
        const item = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'item', line: i})??'')+'';
        if (item === c2foItemId || item === returnItemId2){
          /**
           * @type {number} amount
           */
          const rate = +newRecord.getSublistValue({sublistId: 'item', fieldId: 'rate', line: i}) ?? 0;
          /**
           * @type {number} amount
           */
          const amount = +newRecord.getSublistValue({sublistId: 'item', fieldId: 'amount', line: i}) ?? 0;
          
          const taxCode = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'taxcode', line: i}) ?? '')+'';
          const location = (newRecord.getSublistValue({sublistId: 'item', fieldId: 'location', line: i}) ?? '')+'';
          
          
          arrReturns.push({
            'item': item,
            'rate': rate,
            'amount': amount,
            'taxcode': taxCode,
            'location': location
          });
        }
      }
      log.debug("arrReturns", arrReturns);
      
      if (arrReturns.length === 0) return;
      
      createCreditMemo(recordId, arrReturns);
      
    }
    const createCreditMemo = (recordId, arrReturns) => {
      
      // Create credit memo
      const creditMemoRecord = record.transform({
        fromType: record.Type.INVOICE,
        fromId: recordId,
        toType: record.Type.CREDIT_MEMO,
        isDynamic: true,
      });
      
      // Clear credit memo lines
      clearRecordLines(creditMemoRecord);
      
      // Add return lines to credit memo
      addReturnLines(creditMemoRecord, arrReturns);
      
      // Apply credit memo to invoice
      applyCreditMemoLines(creditMemoRecord, recordId);
      
      const cmID = creditMemoRecord.save();
      log.debug("cmID", cmID);
      
      
    }
    
    const clearRecordLines = (rec) =>{
      // log.debug("clearRecordLines");
      
      const numItems = +rec.getLineCount({sublistId: 'item'}) ?? 0;
      // log.debug("numTiems", numItems);
      for (let i=numItems - 1; i>=0; i--){
        rec.removeLine({
          sublistId: 'item',
          line: i,
          ignoreRecalc: true
        });
      }
      // log.debug("rec", rec);
      // const s2 = rec.getLineCount({sublistId: 'item'});
      // log.debug("s2",  s2);
      
    }
    
    
    const addReturnLines = (rec, arr) =>{
      // log.debug("addReturnLines");
      const t1 = rec.getLineCount({sublistId:'item'})
      
      let line = 0
      arr.forEach(val => {
        const item = val.item;
        const rate = val.rate;
        const amount = val.amount;
        log.debug("val", val);
        log.debug("item", item);
        log.debug("rate", rate);
        log.debug("amount", amount);
        
        
        rec.selectNewLine({
          sublistId: 'item'
        });
        rec.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'item',
          value: item
        });
        rec.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'rate',
          value: rate
        });
        rec.setCurrentSublistValue({
          sublistId: 'item',
          fieldId: 'amount',
          value: amount
        });
        rec.commitLine({sublistId: 'item'})
        line++;
      });
      // log.debug("lines processed", line);
      
      // const t2 = rec.getLineCount({sublistId:'item'});
      // log.debug("rec line count 2", t2);
    };
    
    const applyCreditMemoLines = (rec, invoice) => {
      const lineToApply = rec.findSublistLineWithValue({
        sublistId: 'apply',
        fieldId: 'internalid',
        value: invoice
      });
      // log.debug('lineToApply', lineToApply)
      
      rec.selectLine({
        sublistId: 'apply',
        line: lineToApply
      });
      rec.setCurrentSublistValue({
        sublistId: 'apply',
        fieldId: 'apply',
        value: true
      });
      rec.setCurrentSublistValue({
        sublistId: 'apply',
        fieldId: 'due',
        value: rec.getValue({fieldId: 'total'})
      });
      // rec.setCurrentSublistValue({
      //     sublistId: 'apply',
      //     fieldId: 'internalid',
      //     value: invoice
      // });
      rec.commitLine({sublistId: 'apply'})
      
    }
    
    /**
     * @param {ReduceContext} context - Data collection containing grouped key/value pairs
     * @return {void}
     */
    const reduce = context => {
      try {
        log.audit('reduce', context);
        const {key, values} = context;
        
      } catch (e) {
        log.error('reduce', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
      }
    };
    
    /**
     * @param {SummarizeContext} context - Holds statistics regarding the execution of a map/reduce script
     * @return {void}
     */
    const summarize = context => {
      try {
        log.audit('summarize', context);
        const {dateCreated, seconds, usage, concurrency, yields} = context;
        
      } catch (e) {
        log.error('summarize', e.toJSON ? e : (e.stack ? e.stack : e.toString()));
      } finally {
        log.audit('Finished', 'Finished');
      }
    };
    
    return {
      getInputData,
      map,
      reduce,
      summarize,
    };
  },
);