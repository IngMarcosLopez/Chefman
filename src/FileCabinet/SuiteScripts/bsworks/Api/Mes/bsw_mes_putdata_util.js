/**
 * 推送数据到NetSuite-工具类
 */
define([], () => {

    /**
    * 获取仓库对应的库位
    * @param {*} requestBody 
    */
    const getLocationBins = (bsworks, locations) => {
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
        getLocationBins
    }
});