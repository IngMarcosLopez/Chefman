/**
 * 出库单 GL插件
 * @param {*} transactionRecord 
 * @param {*} standardLines 
 * @param {*} customLines 
 * @param {*} book 
 */
function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try {

        var recordType = transactionRecord.getRecordType();
        // nlapiLogExecution("DEBUG", "recordType", recordType);
        if (recordType != "itemfulfillment") return;
        var statusRef = transactionRecord.getFieldValue('statusRef');
        // nlapiLogExecution("DEBUG", "statusRef", statusRef);
        if (statusRef != "shipped") return; //非已发运状态
        //2024-10-01之前的数据不执行
        var trandate = transactionRecord.getFieldValue('trandate');
        if (trandate < "2024-10-01") return;
        //10月份custbody_ca_operation不是(ID!=22720)，也都不能产生GL影响
        if (trandate < "2024-11-01") {
            const ca_operation = transactionRecord.getFieldValue('custbody_ca_operation');
            if (ca_operation != "22720") return;
        }
        // var recordId = transactionRecord.getId();
        // nlapiLogExecution("DEBUG", "customizeGlImpact", JSON.stringify({ recordType: recordType, recordId: recordId }));
        var subsidiary = transactionRecord.getFieldValue('subsidiary');
        var accountObj = getScCostConfigData(subsidiary);
        // nlapiLogExecution("DEBUG", "accountObj", JSON.stringify(accountObj));
        if (accountObj.credit == null || accountObj.credit == "") return;
        if (accountObj.debit == null || accountObj.debit == "") return;

        var debitTotalAmount = 0;
        var count = standardLines.getCount();
        for (var i = 0; i < count; i++) {
            var currLine = standardLines.getLine(i);
            if (currLine.accountId != "213") continue;
            // nlapiLogExecution("DEBUG", "currLine", JSON.stringify(currLine));
            var debitAmount = currLine.getDebitAmount();
            if (null != debitAmount && "" != debitAmount) {
                debitTotalAmount = parseFloat(debitTotalAmount) + parseFloat(debitAmount);
            }
        }
        if (parseFloat(debitTotalAmount) == 0) return;

        debitTotalAmount = parseFloat(debitTotalAmount).toFixed(2);
        var creditLine = customLines.addNewLine();        // 添加新行【添加贷方】
        creditLine.setAccountId(Number(accountObj.credit));           // 设置【贷方科目】
        creditLine.setDebitAmount(debitTotalAmount);          // 设置【贷方金额】
        // newLine.setSegmentValueId('cseg1', 1);
        // newLine.setEntityId(1325)
        var debitLine = customLines.addNewLine();        // 添加新行【添加借方】
        debitLine.setAccountId(Number(accountObj.debit));           // 设置【借方科目】
        debitLine.setCreditAmount(debitTotalAmount);          // 设置【借方金额】

        // var count = customLines.getCount();
        // for (var i = 0; i < count; i++) {
        //     var currLine = customLines.getLine(i);
        //     nlapiLogExecution("DEBUG", "customizeGlImpact", JSON.stringify(currLine));
        // }
    } catch (e) {
        nlapiLogExecution("ERROR", "gl error", e);
    }


}

function getScCostConfigData(subsidiary) {
    var costSearch = nlapiSearchRecord("customrecord_sc_cogs_carry_configuration", null,
        [
            ["custrecord_sc_ccc_subsiduary", "is", subsidiary]
        ],
        [
            new nlobjSearchColumn("custrecord_sc_ccc_cogs_account"),
            new nlobjSearchColumn("custrecord_sc_ccc_issue_account")
        ]
    );
    var accountObj = {};
    if (costSearch) {
        for (var i = 0; i < costSearch.length; i++) {
            if (accountObj.debit != null && accountObj.debit != "" && accountObj.credit != null && accountObj.credit != "") {
                break;
            }
            var costResult = costSearch[i];
            if (accountObj.credit == null || accountObj.credit == "") {
                accountObj.credit = costResult.getValue("custrecord_sc_ccc_issue_account"); //销售成本科目 - 贷方科目
            }
            if (accountObj.debit == null || accountObj.debit == "") {
                accountObj.debit = costResult.getValue("custrecord_sc_ccc_cogs_account"); //发出商品科目 - 借方科目
            }
        }
    }
    return accountObj;
}

