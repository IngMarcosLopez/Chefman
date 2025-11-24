/**
 * 销售发票 GL插件
 * @param {*} transactionRecord 
 * @param {*} standardLines 
 * @param {*} customLines 
 * @param {*} book 
 */
function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try {

        var recordType = transactionRecord.getRecordType();
        if (recordType != "invoice") return;
        var settingStatus = transactionRecord.getFieldValue('custbody_sc_cogs_carry_over');

        if (!settingStatus) return; //非结转状态
        var subsidiary = transactionRecord.getFieldValue('subsidiary');
        var accountObj = getScCostConfigData(subsidiary);
        if (accountObj.credit == null || accountObj.credit == "") return;
        if (accountObj.debit == null || accountObj.debit == "") return;

        var settingAmount = transactionRecord.getFieldValue('custbody_sc_over_cost_amount');
        if (null == settingAmount || "" == settingAmount || parseFloat(settingAmount) == 0) return;
        settingAmount = parseFloat(settingAmount);
        var creditLine = customLines.addNewLine();        // 添加新行【添加贷方】
        creditLine.setAccountId(Number(accountObj.credit));           // 设置【贷方科目】
        creditLine.setDebitAmount(settingAmount);          // 设置【贷方金额】
        var debitLine = customLines.addNewLine();        // 添加新行【添加借方】
        debitLine.setAccountId(Number(accountObj.debit));           // 设置【借方科目】
        debitLine.setCreditAmount(settingAmount);          // 设置【借方金额】

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
                accountObj.credit = costResult.getValue("custrecord_sc_ccc_cogs_account"); //销售成本科目 - 贷方科目
            }
            if (accountObj.debit == null || accountObj.debit == "") {
                accountObj.debit = costResult.getValue("custrecord_sc_ccc_issue_account"); //发出商品科目 - 借方科目
            }
        }
    }
    return accountObj;
}

