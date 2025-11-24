/**
 * 销售发票 用户事件
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-2.0", "N/search", "N/record"], (bsworks, search, record) => {


    const beforeSubmit = (context) => {
        if (context.type == "delete") {
            try {
                //删除关联记录
                const searchFields = [
                    { id: "internalid" },
                    { id: "custrecord_sc_relation_invoice_number", filter: { values: context.newRecord.id } }
                ]
                const searchDataList = bsworks.search(search).getSearchResultDataList("customrecord_sc_tran_relation_invoice", searchFields, 1, 1000);
                searchDataList.forEach(sdata => {
                    record.delete({ type: "customrecord_sc_tran_relation_invoice", id: sdata.internalid });
                })
            } catch (e) {
                log.error("error", e);
            }
        }
    }

    return {
        beforeSubmit
    }

});