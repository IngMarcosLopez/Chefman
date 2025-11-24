/**
 /**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 */
define(['N/record'],
    /**
 * @param{record} record
 */
    (record) => {
        /**
         * Defines the Mass Update trigger point.
         * @param {Object} params
         * @param {string} params.type - Record type of the record being processed
         * @param {number} params.id - ID of the record being processed
         * @since 2016.1
         */
        const each = (params) => {
            log.debug({
                title: 'params',
                details: JSON.stringify(params)
            });
            //通过Netsuite帮助搜索：record.load,加载SO记录
            var objRecord = record.load({
                type: params.type,
                id: params.id
            });
            //获取货品子列表行数
            var lineCount = objRecord.getLineCount({
                sublistId: 'item'
            });
            //loop through each line
            for (var i = 0; i < lineCount; i++) {
                objRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'quantity',
                    value: 5,
                    line: i
                })
            };
            //save record
            var id = objRecord.save();
            log.debug({
                title: 'id save',
                details: id
            });
        }

        return {each}

    });
