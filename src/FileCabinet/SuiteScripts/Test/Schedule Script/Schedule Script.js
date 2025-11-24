/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */

//应用场景：定期更改日记账备注中的信息
define(['N/record', 'N/search'],
    /**
 * @param{record} record
 * @param{search} search
 */
    (record, search) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        const execute = (scriptContext) => {
            //通过 N/seach module进行搜索，查找search.load的方法
            var mySearch = search.load({
                id: 'customsearch1667'   //search ID
            });

            //通过 N/seach module进行搜索，查找search.run的方法
            mySearch.run().each(function (result) {
                //定义日记账的内部ID
                var id = result.id;

                //通过 N/record module进行搜索，查找record.submitFields的方法
                var id = record.submitFields({
                    type: record.Type.JOURNAL_ENTRY,
                    //id: id,         //id设定为变量id，测试时建议不要这样更新
                    id: 32851,
                    values: {
                        memo: 'SF account test.'    //设置新值对于日记账的备注字段
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });

                return true;
            });
        }

        return { execute }

    });
