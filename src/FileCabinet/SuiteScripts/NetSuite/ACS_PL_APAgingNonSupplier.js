/**
 * @NApiVersion 2.1
 * @NScriptType Portlet
 */
define(['N/log', 'N/search'],
    function (log, search) {
        const renderPortlet = (params) => {
            let portlet = params.portlet;
            portlet.title = 'A/P Aging Non-Supplier';
            portlet.addColumn({
                id: 'vendor',
                type: 'text',
                label: 'vendor',
                align: 'left',
            });
            portlet.addColumn({
                id: 'current',
                type: 'currency',
                label: 'Current',
                align: 'left',
            });
            portlet.addColumn({
                id: 'bucket1',
                type: 'currency',
                label: '1-30 Days',
                align: 'left',
            });
            portlet.addColumn({
                id: 'bucket2',
                type: 'currency',
                label: '31-60 Days',
                align: 'left',
            });
            portlet.addColumn({
                id: 'bucket3',
                type: 'currency',
                label: '61-90 Days',
                align: 'left',
            });
            portlet.addColumn({
                id: 'bucket4',
                type: 'currency',
                label: '90+ Days',
                align: 'left',
            });
            portlet.addColumn({
                id: 'total',
                type: 'float',
                label: 'Total Balance',
                align: 'left',
            });
            let customerSearch = search.load({id: 'customsearch2611'});
            let topTen = customerSearch.run().getRange({start: 0, end: 10});
            topTen.forEach(result => {
                let row = {};
                row.vendor = result.getValue(result.columns[0])
                row.current = Number(result.getValue(result.columns[2]));
                row.bucket1 = Number(result.getValue(result.columns[3]));
                row.bucket2 = Number(result.getValue(result.columns[4]));
                row.bucket3 = Number(result.getValue(result.columns[5]));
                row.bucket4 = Number(result.getValue(result.columns[6]));
                row.total = Number(result.getValue(result.columns[7]));
                portlet.addRow(row);
            });
            let remainder = customerSearch.run().getRange({start: 10, end: 1000});
            let current = 0, bucket1 = 0, bucket2 = 0, bucket3 = 0, bucket4 = 0, total = 0;
            remainder.forEach(result => {
                let sumCurrent =  Number(result.getValue(result.columns[2]));
                let sumBucket1 = Number(result.getValue(result.columns[3]));
                let sumBucket2 = Number(result.getValue(result.columns[4]));
                let sumBucket3 = Number(result.getValue(result.columns[5]));
                let sumBucket4 = Number(result.getValue(result.columns[6]));
                let sumTotal = Number(result.getValue(result.columns[7]));
                current += Number(sumCurrent);
                bucket1 += Number(sumBucket1);
                log.debug('bucket1', bucket1 + ' : ' + sumBucket1);
                bucket2 += Number(sumBucket2);
                bucket3 += Number(sumBucket3);
                bucket4 += Number(sumBucket4);
                total += Number(sumTotal);
            });
            let rowOther = {};
            rowOther.vendor = '<a class="dottedlink viewitem" href="https://7336086-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=2611&whence=">Other</a>';
            rowOther.current = current;
            rowOther.bucket1 = bucket1;
            rowOther.bucket2 = bucket2;
            rowOther.bucket3 = bucket3;
            rowOther.bucket4 = bucket4;
            rowOther.total = total.toFixed(2);
            portlet.addRow(rowOther);
        }
        return {render: renderPortlet}
    });