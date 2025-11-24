var scsVendorCE = {

    fieldChanged: function (sublist, field, line) {
        
        if (field == 'category') {
            scsVendorCE.validateCategory();
        }
    },

    /**
     * Prevents a user from selecting the Supplier Category through the UI.
     */
    validateCategory: function () {

        const supplier = 2;
        const recordId = nlapiGetRecordId();
        const category = nlapiGetFieldValue('category');
        if (!recordId && category == supplier) {
            alert('You cannot create a Supplier Vendor. Please select another category.');
            nlapiSetFieldValue('category', '');
        }
    }
};
