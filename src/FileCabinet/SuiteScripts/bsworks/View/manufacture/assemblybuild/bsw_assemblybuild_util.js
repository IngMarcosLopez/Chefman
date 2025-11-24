/**
 * 装配件构建-通用处理工具类
 * @NApiVersion 2.1
 * @NModuleScope SameAccount
 *
 */

define(["../../../plugin/bsworks/bsworksUtil-1.0.min", "N/record"], (bsworks, record) => {


    /**
    * 创建库存转移单
    * @param {*} data 
    */
    const doCreateInventoryTransfer = (data) => {
        const assemblyRecord = record.load({ type: "assemblybuild", id: data.recordId });
        //计算待转移库存数量
        const quantity = assemblyRecord.getValue("quantity");
        const pickingset = assemblyRecord.getValue("custbody_csm_picking_set");
        const adjustqtyby = (parseFloat(quantity) || 0) - (parseFloat(pickingset) || 0);
        if (parseFloat(adjustqtyby) <= 0) {
            return bsworks.https.getFailResponse("构建数量不能小于已转移库存数量");
        }
        const recordObj = record.create({ type: 'inventorytransfer', isDynamic: true, });
        recordObj.setValue({ fieldId: "trandate", value: assemblyRecord.getValue("trandate") });
        const subsidiary = assemblyRecord.getValue("subsidiary");
        recordObj.setValue({ fieldId: 'subsidiary', value: subsidiary });
        const location = assemblyRecord.getValue("location");
        recordObj.setValue({ fieldId: 'location', value: location });
        //公司ID=25时，外协转库：默认为车间仓（ID=68) 完工转库：默认为成品仓（ID=40)
        //const transferlocation = (data.buttonId == "custpage_assemblybuild_outitem" ? "68" : "40");
        //20240416 外协转库和完工转库的至地点都改成ID=32 厨曼杭州 (Chuman Hangzhou) 
        //20240808 完工转库----成品仓  外协转库---厨曼仓
        const transferlocation = (data.buttonId == "custpage_assemblybuild_outitem" ? "32" : "40");
        recordObj.setValue({ fieldId: 'transferlocation', value: transferlocation });

        recordObj.setValue({ fieldId: "custbody_chefman_built_no", value: assemblyRecord.id });
        recordObj.setValue({ fieldId: "custbody_chefman_assembly", value: assemblyRecord.getValue("item") });
        recordObj.setValue({ fieldId: "custbody_chefman_bom", value: assemblyRecord.getValue("billofmaterials") });
        recordObj.setValue({ fieldId: "custbody_chefman_bom_rev", value: assemblyRecord.getValue("billofmaterialsrevision") });
        recordObj.setValue({ fieldId: "custbody_csm_picking_set", value: adjustqtyby });
        recordObj.setValue({ fieldId: 'memo', value: data.buttonId == "custpage_assemblybuild_outitem" ? "外协转库" : "完工转库" });


        //获取仓库对应的库位
        const locations = [location, transferlocation];
        const locaitonBins = getLocationBins(locations);
        const binnumber = locaitonBins[location];
        const tobinnumber = locaitonBins[transferlocation];


        recordObj.selectNewLine({ sublistId: "inventory" });
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'item', value: assemblyRecord.getValue("item") });
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'units', value: assemblyRecord.getValue("units") });

        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: 'adjustqtyby', value: adjustqtyby });
        const sourcedocFlag = "assemblybuild#" + data.recordId + "#" + adjustqtyby;
        recordObj.setCurrentSublistValue({ sublistId: "inventory", fieldId: "custcol_chefman_sourcedoc_flag", value: sourcedocFlag });
        //写入库存详情
        try {
            const inventorydetailRecord = recordObj.getCurrentSublistSubrecord({ sublistId: "inventory", fieldId: "inventorydetail" });
            inventorydetailRecord.selectNewLine({ sublistId: "inventoryassignment" });
            if (binnumber) {
                inventorydetailRecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "binnumber",
                    value: binnumber
                });
            }
            if (tobinnumber) {
                inventorydetailRecord.setCurrentSublistValue({
                    sublistId: "inventoryassignment",
                    fieldId: "tobinnumber",
                    value: tobinnumber
                });
            }
            // inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "inventorystatus", value: "1" });
            // inventorydetailRecord.setCurrentSublistValue({ sublistId: "inventoryassignment", fieldId: "toinventorystatus", value: "1" });
            inventorydetailRecord.setCurrentSublistValue({
                sublistId: "inventoryassignment",
                fieldId: "quantity",
                value: adjustqtyby
            });
            inventorydetailRecord.commitLine({ sublistId: 'inventoryassignment' });
        } catch (e) {
            log.error("", e);
        }

        recordObj.commitLine({ sublistId: "inventory" });

        const internalid = recordObj.save();

        //反填构建装配单已转移库存数量
        const custbody_csm_picking_set = (parseFloat(pickingset) || 0) + parseFloat(adjustqtyby);
        assemblyRecord.setValue({ fieldId: 'custbody_csm_picking_set', value: custbody_csm_picking_set });
        //更改转库操作记录=3/已生成转移单
        let assemblybuild_operator = "2";
        if (data.assemblybuild_operator) {
            assemblybuild_operator = data.assemblybuild_operator;
        }
        assemblyRecord.setValue({ fieldId: 'custbody_assemblybuild_operator', value: assemblybuild_operator });
        assemblyRecord.save();
        return bsworks.https.getSuccessResponse(null, { internalid: internalid });
    }

    /**
    * 获取仓库对应的库位
    * @param {*} requestBody 
    */
    const getLocationBins = (locations) => {
        const locationBin = {};
        if (null == locations || locations.length == 0) return locationBin;
        try {
            const searchFields = [
                { id: "isinactive", label: "非活动", search: { type: "none" }, filter: { values: "F" } },
                { id: "custrecord_csm_location_bin", alias: "bin", label: "库位ID" },
                { id: "internalid", label: "仓库ID", filter: { operator: "anyof", values: locations } }
            ]
            const dataList = bsworks.search.getSearchResultDataList("location", searchFields, 1, 1000, null);
            dataList.forEach(data => {
                if (data.bin) {
                    locationBin[data.internalid] = data.bin;
                }
            })
        } catch (e) {
            log.debug("getLocationBin throws exception", e);
        }
        return locationBin;
    }

    return {
        doCreateInventoryTransfer
    }

});