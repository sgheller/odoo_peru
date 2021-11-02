odoo.define('pos_prescription_creation.receipt', function(require){

    var core = require('web.core');
    var QWeb = core.qweb;
	var gui = require('point_of_sale.gui');
	var screens = require('point_of_sale.screens');
	var chrome = require('point_of_sale.chrome');
	var flexiretail_com_advance_screens = require('flexiretail_com_advance.screens');
	var flexiretail_com_advance_chrome = require('flexiretail_com_advance.chrome');


    // For Prescription Receipt
    var PrintPrescriptionScreenWidget = screens.ReceiptScreenWidget.extend({
        template: 'PrintPrescriptionScreenWidget',
        get_receipt_render_env: function() {
            var order = this.pos.get_order();
            var optical_order = this.pos.optical.order_by_id[order.get_screen_data('params')]
            return {
                widget: this,
                pos: this.pos,
                order: order,
                optical_order: optical_order,
                receipt: order.export_for_printing(),
                orderlines: order.get_orderlines(),
                paymentlines: order.get_paymentlines(),
            };
        },
        print_html: function () {
            var receipt = QWeb.render('PrescriptionOrderReceipt', this.get_receipt_render_env());
            this.pos.proxy.printer.print_receipt(receipt);
            this.pos.get_order()._printed = true;
        },
        click_back: function() {
           this._super();
           this.gui.show_screen('products');
        },
        render_receipt: function() {
            this.$('.pos-receipt-container').html(QWeb.render('PrescriptionOrderReceipt', this.get_receipt_render_env()));
        },
    });
    gui.define_screen({name:'PrescriptionReceipt', widget: PrintPrescriptionScreenWidget});

    // For POS Receipt
    chrome.Chrome.include({
		save_receipt_for_reprint:function(){
            var self = this;
            var order = this.pos.get_order();
            if (order.optical_reference){
                if (order.optical_reference.id)
                    var optical_order = this.pos.optical.order_by_id[order.optical_reference.id]
                else
                    var optical_order = this.pos.optical.order_by_id[order.optical_reference]
            }
            else
                optical_order = 0;
			var env = {
                widget:self,
                pos: this.pos,
                order: order,
                optical_order: optical_order,
                receipt: order.export_for_printing(),
                orderlines: order.get_orderlines(),
                paymentlines: order.get_paymentlines(),
            };
            var receipt_html = QWeb.render('PosTicket',env);
        	order.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
        	var receipt = QWeb.render('XmlReceipt',env);
        	order.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
        },
    });

    screens.ReceiptScreenWidget.include({
        render_receipt: function() {
            var order = this.pos.get_order();
            if (order.optical_reference){
                if (order.optical_reference.id)
                    var optical_order = this.pos.optical.order_by_id[order.optical_reference.id]
                else
                    var optical_order = this.pos.optical.order_by_id[order.optical_reference]
            }
            else
                optical_order = 0;
            if (order.get_free_data()){
                this.$('.pos-receipt-container').html(QWeb.render('FreeTicket',{
                    widget:this,
                    order: order,
                }));
            }else if(order.get_receipt()){
                var no = $('input#no_of_copies').val()
                var category_data = '';
                var order_data = '';
                var payment_data = '';
                if(Object.keys(order.get_order_list().order_report).length == 0 ){
                    order_data = false;
                }else{
                    order_data = order.get_order_list()['order_report']
                }
                if(Object.keys(order.get_order_list().category_report).length == 0 ){
                    category_data = false;
                }else{
                    category_data = order.get_order_list()['category_report']
                }
                if(Object.keys(order.get_order_list().payment_report).length == 0 ){
                    payment_data = false;
                }else{
                    payment_data = order.get_order_list()['payment_report']
                }
                var receipt = "";
                for(var i=0;i < no;i++){
                    receipt += QWeb.render('CustomTicket',{
                        widget:this,
                        order: order,
                        receipt: order.export_for_printing(),
                        order_report : order_data,
                        category_report : category_data,
                        payment_report : payment_data
                    })
                }
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_order_summary_report_mode()){
                var no = $('#no_of_summary').val();
                var product_summary_key = Object.keys(order.get_product_summary_report()['product_summary'] ? order.get_product_summary_report()['product_summary'] :false );
                if(product_summary_key.length > 0){
                    var product_summary_data = order.get_product_summary_report()['product_summary'];
                } else {
                    var product_summary_data = false;
                }
                var category_summary_key = Object.keys(order.get_product_summary_report()['category_summary']);
                 if(category_summary_key.length > 0){
                    var category_summary_data = order.get_product_summary_report()['category_summary'];
                } else {
                    var category_summary_data = false;
                }
                 var payment_summary_key = Object.keys(order.get_product_summary_report()['payment_summary']);
                 if(payment_summary_key.length > 0){
                     var payment_summary_data = order.get_product_summary_report()['payment_summary'];
                } else {
                    var payment_summary_data = false;
                }
                var location_summary_key = Object.keys(order.get_product_summary_report()['location_summary']);
                 if(location_summary_key.length > 0){
                     var location_summary_data = order.get_product_summary_report()['location_summary'];
                } else {
                    var location_summary_data = false;
                }
                var receipt = "";
                for (var step = 0; step < no; step++) {
                    receipt += QWeb.render('ProductSummaryReport',{
                        widget:this,
                        order: order,
                        receipt: order.export_for_printing(),
                        product_details: product_summary_data,
                        category_details: category_summary_data,
                        payment_details: payment_summary_data,
                        location_details:location_summary_data,
                    })
                }
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_sales_summary_mode()) {
                var journal_key = Object.keys(order.get_sales_summary_vals()['journal_details']);
                if(journal_key.length > 0){
                    var journal_summary_data = order.get_sales_summary_vals()['journal_details'];
                } else {
                    var journal_summary_data = false;
                }
                var sales_key = Object.keys(order.get_sales_summary_vals()['salesmen_details']);
                if(sales_key.length > 0){
                    var sales_summary_data = order.get_sales_summary_vals()['salesmen_details'];
                } else {
                    var sales_summary_data = false;
                }
                var total = Object.keys(order.get_sales_summary_vals()['summary_data']);
                if(total.length > 0){
                    var total_summary_data = order.get_sales_summary_vals()['summary_data'];
                } else {
                    var total_summary_data = false;
                }
                var receipt = "";
                receipt = QWeb.render('PaymentSummaryReport',{
                    widget:this,
                    order: order,
                    receipt: order.export_for_printing(),
                    journal_details: journal_summary_data,
                    salesmen_details: sales_summary_data,
                    total_summary : total_summary_data
                })
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_receipt_mode()){
                var data = order.get_product_vals();
                var receipt = "";
                receipt = QWeb.render('OutStockPosReport',{
                    widget:this,
                    order: order,
                    receipt: order.export_for_printing(),
                    location_data: order.get_location_vals(),
                    product_data: data,
                })
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_money_inout_details()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('MoneyInOutTicket',{
                   widget:this,
                   order: order,
                   money_data: order.get_money_inout_details(),
                }));
            } else if(order.get_cash_register()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('CashInOutStatementReceipt',{
                    widget:this,
                    order: order,
                    statements: order.get_cash_register(),
                }));
            } else if(order.get_delivery_payment_data()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('DeliveryPaymentTicket',{
                    widget:this,
                    order: order,
                    pos_order: order.get_delivery_payment_data(),
                 }));
            } else{
                if(order && order.is_reprint){
                    this.$('.pos-receipt-container').html(order.print_receipt_html);
                }else{
                    this.$('.pos-receipt-container').html(QWeb.render('PosTicket',{
                        widget:this,
                        order: order,
                        optical_order: optical_order,
                        receipt: order.export_for_printing(),
                        orderlines: order.get_orderlines(),
                        paymentlines: order.get_paymentlines(),
                    }));
                }
            }
            var barcode_val = this.pos.get_order().get_name();
            if (barcode_val.indexOf(_t("Order ")) != -1) {
                var vals = barcode_val.split(_t("Order "));
                if (vals) {
                    var barcode = vals[1];
                    $("tr#barcode1").html($("<td style='padding:2px 2px 2px 0px; text-align:center;'><div class='" + barcode + "' width='150' height='50'/></td>"));
                    $("." + barcode.toString()).barcode(barcode.toString(), "code128");
                }
            }
        },
    });

});