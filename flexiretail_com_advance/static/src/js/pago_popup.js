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
                                         var selectedOrder = self.pos.get_order();
                                         if (result && result.lines.length > 0) {
                                                 partner = null;
                                                 if (result.partner_id && result.partner_id[0]) {
                                                     var partner = self.pos.db.get_partner_by_id(result.partner_id[0])
                                                 }
                                                 //selectedOrder.set_amount_due(orden_id.amount_due);
                                                 selectedOrder.set_amount_paid(orden_id.amount_paid);
                                                 selectedOrder.set_amount_return(Math.abs(result.amount_return));
                                                 selectedOrder.set_amount_tax(result.amount_tax);
                                                 selectedOrder.set_amount_total(result.amount_total);
                                                 selectedOrder.set_company_id(result.company_id[1]);
                                                 selectedOrder.set_date_order(result.date_order);
                                                 selectedOrder.set_client(partner);
                                                 selectedOrder.set_pos_reference(result.pos_reference);
                                                 selectedOrder.set_user_name(result.user_id && result.user_id[1]);
                                                 selectedOrder.set_order_note(result.note);
                                                 selectedOrder.set_delivery_date(result.delivery_date);
                                                 selectedOrder.set_delivery_address(result.delivery_address);
                                                 selectedOrder.set_delivery_time(result.delivery_time);
                                                 selectedOrder.set_delivery_type(result.delivery_type);
                                                 selectedOrder.set_delivery_user_id(result.delivery_user_id[0]);
                                                 selectedOrder.set_referencia_pago(orden_id.number); //Nuevo
                                                 var statement_ids = [];
                                                 if (result.statement_ids) {
                                                 	var params = {
                                                 		model: 'account.bank.statement.line',
                                                 		method: 'search_read',
                                                 		domain: [['id', 'in', orden_id.statement_ids]],
                                                 	}
                                                 	rpc.query(params, {async: false}).then(function(st){
                                                 		if (st) {
                                                     		_.each(st, function(st_res){

//                                                     		     var newpaymentline = new exports.Paymentline({},{pos: self.pos, order: this, json: st_res});
//                                                     		     self.paymentlines.add(newpaymentline);

//                                                             	 var pymnt = {};
//                                                             	 pymnt['amount']= st_res.amount;
//                                                                 pymnt['journal']= st_res.journal_id[1];
//                                                                 statement_ids.push(pymnt);

                                                                    var newDebtPaymentline = new models.Paymentline(
                                                                        {},
                                                                        {
                                                                            pos: self.pos,
                                                                            order: selectedOrder,
                                                                            cashregister: _.find(self.pos.cashregisters, function (cr) {
                                                                                return cr.journal_id[0] === st_res.journal_id[0];
                                                                            }),
                                                                        }
                                                                    );
                                                                    newDebtPaymentline.set_amount(st_res.amount);
                                                                    selectedOrder.paymentlines.add(newDebtPaymentline);
                                                     		});


                                                         }
                                                 	}).fail(function(){
                                                     	self.pos.db.notification('danger',"Connection lost");
                                                     });
                                                     //selectedOrder.set_journal(statement_ids);
                                                 }
                                                 var params = {
                                             		model: 'pos.order.line',
                                             		method: 'search_read',
                                             		domain: [['id', 'in', result.lines]],
                                             	}
                                             	rpc.query(params, {async: false}).then(function(lines){
                                             		if (lines) {
                                                     	_.each(lines, function(line){
                                                             var product = self.pos.db.get_product_by_id(Number(line.product_id[0]));
                                                             var _line = new models.Orderline({}, {pos: self.pos, order: selectedOrder, product: product});
                                                             _line.set_discount(line.discount);
                                                             _line.set_quantity(line.qty);
                                                             _line.set_unit_price(line.price_unit)
                                                             _line.set_line_note(line.line_note);
                                                             _line.set_bag_color(line.is_bag);
                                                             _line.set_return_valid_days(line.return_valid_days);
                                                             _line.set_deliver_info(line.deliver);
                                                             if(line && line.is_delivery_product){
                                                             	_line.set_delivery_charges_color(true);
                                                             	_line.set_delivery_charges_flag(true);
                                                             }
                                                             selectedOrder.add_orderline(_line);
                                                     	});
                                                     }
                                             	}).fail(function(){
                                                 	self.pos.db.notification('danger',"Connection lost");
                                                 });
//                                                 if(self.pos.config.iface_print_via_proxy){
                                                 var env = {
                                                         widget: self,
                                                         receipt: selectedOrder.export_for_printing(),
                                                         pos: self.pos,
                                                         order: selectedOrder,
                                                         orderlines: selectedOrder.get_orderlines(),
                                                         paymentlines: selectedOrder.get_paymentlines()
                                                     }

//                                                 var receipt_html = QWeb.render('PosTicket',env);
//                                                 selectedOrder.set_pos_normal_receipt_html(receipt_html.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));

                                                 var receipt = QWeb.render('XmlReceipt',env);
                                                 selectedOrder.set_pos_xml_receipt_html(receipt.replace(/<img[^>]*>/g,"").replace(/<object[^>]*>/g,""));

                                                 /*var receipt = QWeb.render('XmlReceipt',env);
                                                 self.pos.proxy.print_receipt(receipt);
                                                 self.pos.get_order()._printed = true;*/
                                                 self.gui.show_screen('receipt');
                                                 /*self.pos.proxy.print_receipt(QWeb.render('XmlReceipt',env));
                                                 self*/
                                                 //pos.get('selectedOrder').destroy();    //finish order and go back to scan screen
//                                                 }else{
//                                                 	self.gui.show_screen('receipt');
//                                                 }
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

