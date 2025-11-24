/**
 * SC 事务处理关联发票 map/reduce脚本
 * 注：当发票中的日期和审批状态发生变化时，通过定时的方式（修改后的15分钟），不一致信息通过search：customsearch_sc_invoice_infor_match查询，触发record：SC 事务处理关联发票 中的开票日期和开票状态也跟随变化。
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */

define(["../plugin/bsworks/bsworksUtil-2.0", "N/record", "N/format", "N/search"], (bsworks, record, format, search) => {


    const getInputData = (context) => {
        const searchFields = [];
        let dataList = bsworks.savedSearch(search).getSearchAllResultDataList("customsearch_sc_invoice_infor_match", searchFields, 1, 1000);
        log.debug("getInputData", dataList);
        return dataList;
    }

    const map = (context) => {
        const data = JSON.parse(context.value);
        try {
            const recordObj = record.load({ type: "customrecord_sc_tran_relation_invoice", id: data.internalid, isDynamic: true });
            // if (data.trandate) {
            //     const trandate = bsworks.date(format).stringToDate(data.trandate);
            //     recordObj.setValue({ fieldId: "custrecord_sc_relation_invoice_date", value: trandate });
            // }
            // if (data.approvalstatus) {
            //     recordObj.setValue({ fieldId: "custrecord_sc_relation_invoice_status", value: data.approvalstatus });
            // }
            recordObj.setValue({ fieldId: "custrecord_sc_relation_invo_carry_over", value: data.custbody_sc_cogs_carry_over });
            recordObj.save({ ignoreMandatoryFields: true });
        } catch (e) {
            log.error("error", e);
        }


    }


    const reduce = (context) => {
        log.debug('reduce', JSON.stringify(context));
    }

    const summarize = (context) => {
        if (context.mapSummary.errors) {
            context.mapSummary.errors.iterator().each(function (key, value) {
                log.error(key, value);
                return true;
            });
        }
    }

    return { getInputData, map, summarize }
})