/**
 * CA 工费科目发生额 客户端事件
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 *
 */

define(["../../plugin/bsworks/bsworksUtil-1.0.min", "N/ui/dialog", 'N/url', "N/record", "N/format"], (bsworks, dialog, hostUrl, record, format) => {

    /**
     * 页面初始化
     * @param {*} context 
     */
    const pageInit = (context) => {

    }


    /**
     * 执行取数
     * @param {*} recordId 
     * @param {*} buttonId 
     */
    const doGetAccountItem = (recordId, buttonId) => {
        bsworks.client.mask.showLoadingMask(buttonId);
        setTimeout(() => {
            try {
                const respnseData = bsworks.https.post("bsw_ca_common_sl", "doGetAccountItem", { recordId: recordId, buttonId: buttonId });
                dialog.alert({
                    title: "提示",
                    message: respnseData.message
                });
                setTimeout(function () {
                    window.location.reload();
                }, 1500);

            } catch (e) {
                console.log(e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client.mask.clearLoadingMask(buttonId);
            }
        }, 200);
    }

    /**
     * 日记账结转
     * @param {*} recordId 
     * @param {*} buttonId 
     */
    const doJournalSetting = (recordId, buttonId) => {
        bsworks.client.mask.showLoadingMask(buttonId);
        setTimeout(() => {
            try {
                const respnseData = bsworks.https.post("bsw_ca_common_sl", "doJournalSetting", { recordId: recordId, buttonId: buttonId });
                dialog.alert({
                    title: "提示",
                    message: respnseData.message
                });
                setTimeout(function () {
                    window.location.reload();
                }, 1500);

            } catch (e) {
                console.log(e);
                dialog.alert({
                    title: "提示",
                    message: e.message
                });
            } finally {
                bsworks.client.mask.clearLoadingMask(buttonId);
            }
        }, 200);
    }

    const saveRecord = (context) => {
        //当保存工费科目发生额记录时，按照子公司和会计期间作为唯一键，如果有相同的值则不能保存“工费科目发生额”记录，并且提示“xx公司的xx会计期间已创建‘工费科目发生额’记录”
        try {
            const recordObj = context.currentRecord;
            const internalid = recordObj.id;
            const subsidiary = recordObj.getValue("custrecord_ca_ai_subsidiary");
            const account_period = recordObj.getValue("custrecord_ca_ai_account_period");
            let account_periodText = recordObj.getText("custrecord_ca_ai_account_period");
            let account_periodTextArr = account_periodText.split(" : ");
            account_periodText = account_periodTextArr[account_periodTextArr.length - 1];
            let subsidiaryText = recordObj.getText("custrecord_ca_ai_subsidiary");
            //母公司 : Chefman International Holdings LLC : Chefman International Manufacturing LLC : Demo
            let subsidiaryTextArr = subsidiaryText.split(" : ");
            subsidiaryText = subsidiaryTextArr[subsidiaryTextArr.length - 1];

            const searchFields = [
                { id: "isinactive", search: { type: "none" }, filter: { values: "F" } },
                { id: "custrecord_ca_ai_subsidiary", filter: { values: subsidiary } },
                { id: "custrecord_ca_ai_account_period", filter: { values: account_period } }
            ];
            if (internalid) {
                searchFields.push({ id: "internalid", filter: { operator: "noneof", values: [internalid] } });
            }
            const searchDataList = bsworks.search.getSearchResultDataList(recordObj.type, searchFields, 1, 10);
            if (searchDataList.length > 0) {
                dialog.alert({
                    title: "提示",
                    message: subsidiaryText + "公司的 " + account_periodText + " 会计期间已创建‘工费科目发生额’记录"
                });
                return false;
            }

            //重置名称字段值
            const sublistId = "recmachcustrecord_ca_ai_relation_net_amount";
            const lineCount = recordObj.getLineCount({ sublistId: sublistId });
            let totalamount = 0;
            for (let line = 0; line < lineCount; line++) {
                const amount = recordObj.getSublistValue({ sublistId: sublistId, fieldId: "custrecord_ca_ai_net_account", line: line }) || 0;
                totalamount = parseFloat(totalamount) + parseFloat(amount);
            }
            const name = account_periodText + " " + subsidiaryText;
            recordObj.setValue({ fieldId: "name", value: name });
        } catch (e) {
            log.error("saveRecord", e);
        }
        return true;
    }


    return {
        pageInit,
        saveRecord,
        doGetAccountItem,
        doJournalSetting
    }

});