odoo.define('flexiretail_com_advance.PaidInputPopup',function(require) {

    var gui = require('point_of_sale.gui');
    var chrome = require('point_of_sale.chrome');
    var PopupWidget = require('point_of_sale.popups');
    var screens = require('point_of_sale.screens');
    var popups = require('point_of_sale.popups');
    var core = require('web.core');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var utils = require('web.utils');
    var QWeb = core.qweb;
    var _t = core._t;


    var PaidInputPopup = PopupWidget.extend({
        template: 'PaidInputPopup',
        init: function(parent, args) {
            this._super(parent, args);
            this.journals = {};
            this.amount_due = 0.0;
            this.order_id = [];
        },
        events: {
            'click .button.cancel':  'click_cancel',
            'click .button.confirm': 'click_confirm',
        },
        show: function(options){
            this._super();
            var self = this;
            this.journals = self.pos.journals;
            this.amount_due = options.amount_due;
            this.order_id = options.order_id;
            this.renderElement();
        },

        click_confirm: function(){
            var self = this;
            //var order = this.pos.get_order();
            var order = self.order_id;
            var pay_amount = $("#pay_amount").val();
            var pos_metodo_pago = $('option:selected', $('[name=select_forma_pago]')).data('id');
            var session_id = self.pos.all_pos_session[0].id;
            rpc.query({
					model: 'pos.order',
					method: 'pay_order',
					args: [order.id,parseFloat(pay_amount),parseInt(session_id), parseInt(pos_metodo_pago)],
					}).then(function(output) {
                        if(output){

                                 var params = {
                                        model: 'pos.order',
                                        method: 'search_read',
                                        domain: [['id', '=', order.id]],
                                    }
                                    rpc.query(params, {async: false}).then(function(orders){
                                        var orden_id = orders[0];
                                        var result;
                                        _.each(self.pos.get('pos_order_list'),function(item) {
                                            if(item.id == orden_id.id){
                                                result = item;
                                            }
                                        });
                                        order.amount_paid = orden_id.amount_paid;
                                        order.amount_due = orden_id.amount_due;

                                        var selectedOrder = self.pos.get_order();
                                        var currentOrderLines = selectedOrder.get_orderlines();
                                        if(currentOrderLines.length > 0) {
                                            selectedOrder.set_order_id('');
                                            for (var i=0; i <= currentOrderLines.length + 1; i++) {
                                                _.each(currentOrderLines,function(item) {
                                                    selectedOrder.remove_orderline(item);
                                                });
                                            }
                                            selectedOrder.set_client(null);
                                        }

                                        selectedOrder.name = result.pos_reference;
                                        if(result && result.pos_normal_receipt_html){
                                            var env = {
                                                widget: self,
                                                pos: self.pos,
                                                order: selectedOrder,
                                                receipt: selectedOrder.export_for_printing(),
                                                orderlines: selectedOrder.get_orderlines(),
                                            };
//                                            var receipt_html = QWeb.render('PosTicket',env);
//                                            selectedOrder.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
//                                            var receipt = QWeb.render('XmlReceipt',env);
//                                            selectedOrder.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));


                                            var receipt_html = QWeb.render('PosTicket',env);
                                            order.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));
                                            var receipt = QWeb.render('XmlReceipt',env);
                                            order.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));

                                            this.pos.proxy.print_receipt(receipt);
                                            this.pos.get_order()._printed = true;
//                                            selectedOrder.print_receipt_html = result.pos_normal_receipt_html;
//                                            selectedOrder.print_xml_receipt_html = result.pos_xml_receipt_html;
//                                            selectedOrder.is_reprint = true;
//                                            selectedOrder.name = result.pos_reference;
//                                            self.gui.show_screen('receipt');
                                        }

                                    });


                        }
					})

        },
        click_cancel: function(){
            this.gui.close_popup();
        },
    });
    gui.define_popup({name:'paid_popup', widget: PaidInputPopup});


})

