/**
 * 客户弹窗脚本联系
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * @NModuleScope Public
 */

define(["N/ui/dialog"], function (dialog) {    /**N/ui/dialog为Netsuite显示风格 */
    function myScript() {
        var message = "remind";
        dialog.alert({
            title: "netsuite style",
            message:message
    });
    }
    return {
        PageInit,
    };
});