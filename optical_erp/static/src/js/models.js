odoo.define('pos_prescription_creation.models', function(require){

    var ActionpadWidget = require("point_of_sale.screens").ActionpadWidget;  
	var PosBaseWidget = require('point_of_sale.BaseWidget');  
	var chrome = require('point_of_sale.chrome');
	var models = require('point_of_sale.models');
	var core = require('web.core');
	var gui = require('point_of_sale.gui');
	var screens = require('point_of_sale.screens');
	var _t = core._t;
    var flexiretail_com_advance_chrome = require('flexiretail_com_advance.chrome');
    var rpc = require('web.rpc');
    var PosModelSuper = models.PosModel;
    var OrderSuper = models.Order;

    models.load_fields("res.partner", ["doc_type", "doc_number", "commercial_name", "legal_name", "is_validate", "state", "condition", "company_type"]);
    models.load_fields("pos.order", ['optical_reference']);
    var _super_order = models.Order.prototype;

    models.Order = models.Order.extend({
        initialize: function(attributes,options){
           OrderSuper.prototype.initialize.apply(this, arguments);
        },
        init_from_JSON: function (json) {
            var res = _super_order.init_from_JSON.apply(this, arguments);
            if (json.optical_reference) {
                var optical_reference = this.pos.optical.order_by_id[json.optical_reference];
                if (optical_reference) {
                    this.set_optical_reference(optical_reference);
                }
            }
            return res;
        },
        export_as_JSON: function () {
            var json = _super_order.export_as_JSON.apply(this, arguments);
            if (this.optical_reference) {
                if (this.optical_reference[0])
                    json.optical_reference=this.optical_reference[0];
                else
                    json.optical_reference = this.optical_reference.id;
            }
            return json;
        },
        set_optical_reference: function (optical_reference) {
            this.optical_reference = optical_reference;
            this.trigger('change', this);
        },
        get_doc_type: function() {
            var client = this.get_client();
            var doc_type=client ? client.doc_type : "";
            if(doc_type == undefined){
                var id_client = client.id;
                var data_client = this.pos.get_pos_client(id_client);
                if(data_client != undefined){
                    doc_type = data_client.doc_type;
                }
            }
            return doc_type;
        },
        get_doc_number: function() {
            var client = this.get_client();
            var doc_number=client ? client.doc_number : "";
            if(doc_number == undefined){
                var id_client = client.id;
                var data_client = this.pos.get_pos_client(id_client);
                if(data_client != undefined){
                    doc_number = data_client.doc_number;
                }
            }
            return doc_number;
        },
    });

    models.PosModel = models.PosModel.extend({
        get_optical_reference: function() {
            var order = this.get_order();
            if (order.optical_reference) {
                optical_reference = this.optical.order_by_id[order.optical_reference.id]
                return optical_reference;
            }
            return null;
        },
        delete_current_order: function(){
            var order = this.get_order();
            if (order) {
                order.destroy({'reason':'abandon'});
            }
            $('.optical_prescription').text("Prescription")
        },
        initialize: function(session, attributes) {
            var res = PosModelSuper.prototype.initialize.apply(this, arguments);
            this.company_types = [
                {'code': 'person', 'name': 'individual'},
                {'code': 'company', 'name': 'Compañia'}
            ],
                this.doc_types = [
                    {'code': '0', 'name': 'DOC.TRIB.NO.DOM.SIN.RUC'},
                    {'code': '1', 'name': 'DNI'},
                    {'code': '4', 'name': 'CARNET DE EXTRANJERIA'},
                    {'code': '6', 'name': 'RUC'},
                    {'code': '7', 'name': 'PASAPORTE'},
                    {'code': 'A', 'name': 'CÉDULA DIPLOMÁTICA DE IDENTIDAD'}];
            this.partner_states = [
                {'code': 'ACTIVO', 'name': 'ACTIVO'},
                {'code': 'BAJA DE OFICIO', 'name': 'BAJA DE OFICIO'},
                {'code': 'BAJA PROVISIONAL', 'name': 'BAJA PROVISIONAL'},
                {'code': 'SUSPENSION TEMPORAL', 'name': 'SUSPENSION TEMPORAL'},
                {'code': 'INHABILITADO-VENT.UN', 'name': 'INHABILITADO-VENT.UN'},
                {'code': 'BAJA MULT.INSCR. Y O', 'name': 'BAJA MULT.INSCR. Y O'},
                {'code': 'PENDIENTE DE INI. DE', 'name': 'PENDIENTE DE INI. DE'},
                {'code': 'OTROS OBLIGADOS', 'name': 'OTROS OBLIGADOS'},
                {'code': 'NUM. INTERNO IDENTIF', 'name': 'NUM. INTERNO IDENTIF'},
                {'code': 'ANUL.PROVI.-ACTO ILI', 'name': 'ANUL.PROVI.-ACTO ILI'},
                {'code': 'ANULACION - ACTO ILI', 'name': 'ANULACION - ACTO ILI'},
                {'code': 'BAJA PROV. POR OFICI', 'name': 'BAJA PROV. POR OFICI'},
                {'code': 'ANULACION - ERROR SU', 'name': 'ANULACION - ERROR SU'},
            ];
            this.partner_conditions = [
                {'code': 'HABIDO', 'name': 'HABIDO'},
                {'code': 'NO HALLADO', 'name': 'NO HALLADO'},
                {'code': 'NO HABIDO', 'name': 'NO HABIDO'},
                {'code': 'PENDIENTE', 'name': 'PENDIENTE'},
                {'code': 'NO HALLADO SE MUDO D', 'name': 'NO HALLADO SE MUDO D'},
                {'code': 'NO HALLADO NO EXISTE', 'name': 'NO HALLADO NO EXISTE'},
                {'code': 'NO HALLADO FALLECIO', 'name': 'NO HALLADO FALLECIO'},
                {'code': 'NO HALLADO OTROS MOT', 'name': 'NO HALLADO OTROS MOT'},
                {'code': 'NO APLICABLE', 'name': 'NO APLICABLE'},
                {'code': 'NO HALLADO NRO.PUERT', 'name': 'NO HALLADO NRO.PUERT'},
                {'code': 'NO HALLADO CERRADO', 'name': 'NO HALLADO CERRADO'},
                {'code': 'POR VERIFICAR', 'name': 'POR VERIFICAR'},
                {'code': 'NO HALLADO DESTINATA', 'name': 'NO HALLADO DESTINATA'},
                {'code': 'NO HALLADO RECHAZADO', 'name': 'NO HALLADO RECHAZADO'},
                {'code': '-', 'name': 'NO HABIDO'},
            ];
            return res;
        },
        get_pos_client : function(client_id){
            self = this;
            var client = {}
            rpc.query({
                model: 'pos.order',
                method: 'pos_get_client',
                args: [false, client_id],
            }, {
                async: false,
                timeout: 7200,
            })
                .then(function (result) {
                    client = result
                }).fail(function (type, error) {
                self.config.is_sync = true;
                console.log('Failed to get_details_amount_pos');
            });
            return client;
        },
        validate_pe_doc: function (doc_type, doc_number) {
            if (!doc_type || !doc_number){
                return false;
            }
            if (doc_number.length==8 && doc_type=='1') {
                return true;
            }
            else if (doc_number.length==11 && doc_type=='6')
            {
                var vat= doc_number;
                var factor = '5432765432';
                var sum = 0;
                var dig_check = false;
                if (vat.length != 11){
                    return false;
                }
                try{
                    parseInt(vat)
                }
                catch(err){
                    return false;
                }

                for (var i = 0; i < factor.length; i++) {
                    sum += parseInt(factor[i]) * parseInt(vat[i]);
                 }

                var subtraction = 11 - (sum % 11);
                if (subtraction == 10){
                    dig_check = 0;
                }
                else if (subtraction == 11){
                    dig_check = 1;
                }
                else{
                    dig_check = subtraction;
                }

                if (parseInt(vat[10]) != dig_check){
                    return false;
                }
                return true;
            }
            else if (doc_number.length>=3 &&  ['0', '4', '7', 'A'].indexOf(doc_type)!=-1) {
                return true;
            }
            else if (doc_type.length>=2) {
                return true;
            }
            else {
                return false;
            }
        },
    });

    chrome.OrderSelectorWidget.include({
        order_click_handler: function(event,$el) {
            this._super(event,$el);
            var order = this.pos.get_order();
            if (order!==null && order!==undefined && order.optical_reference)
                $('.optical_prescription').text(order.optical_reference.name)
            else
                $('.optical_prescription').text("Prescription")
        },

        neworder_click_handler: function(event, $el) {
            this._super(event, $el);
            $('.optical_prescription').text("Prescription")
        },

        deleteorder_click_handler: function(event,$el) {
            this._super(event,$el);
            var order = this.pos.get_order();
            if (order!==null && order!==undefined && order.optical_reference)
                $('.optical_prescription').text(order.optical_reference.name)
            else
                $('.optical_prescription').text("Prescription")
        },
    });

	screens.PaymentScreenWidget.include({
        validate_order: function(force_validation){
            $('.optical_prescription').text("Prescription");
        	this._super(force_validation);
        },
    });

	screens.ClientListScreenWidget.include({
    display_client_details: function(visibility,partner,clickpos){
        this._super(visibility,partner,clickpos);
        var self = this;
        var contents = this.$('.client-details-contents');
        if (contents.find("[name='doc_type']").val()==6){
            contents.find('.partner-state').show();
            contents.find('.partner-condition').show();
        }
        else {
            contents.find('.partner-state').hide();
            contents.find('.partner-condition').hide();
        }
        contents.find('.doc_number').on('change',function(event){
                var doc_type = contents.find("[name='doc_type']").val();
                var doc_number = this.value;
                self.set_client_details(doc_type, doc_number, contents);
            });
        contents.find("[name='doc_type']").on('change',function(event){
                var doc_type = this.value;
                var doc_number = contents.find(".doc_number").val();
                if (doc_type=="6"){
                    contents.find('.partner-state').show();
                    contents.find('.partner-condition').show();
                }
                else{
                    contents.find('.partner-state').hide();
                    contents.find('.partner-condition').hide();
                }
                if (doc_number && doc_type){
                    self.set_client_details(doc_type, doc_number, contents);
                }
            });

    },
    set_client_details: function(doc_type, doc_number, contents) {
        var self = this;
        if (doc_type && !doc_number && doc_type!="0"){
            self.gui.show_popup('error',_t('The document number is required'));
            return;
        }
        if (!doc_type && doc_number){
            self.gui.show_popup('error',_t('The document type is required'));
            return;
        }
        if (doc_type && doc_number){
            if (doc_type == "1" || doc_type == "6"){
                if(!self.pos.validate_pe_doc(doc_type, doc_number)){
                    self.gui.show_popup('error',_t('The type of document or document number is incorrect'));
                    return;
                }
                else{
                    rpc.query({
                        model: 'res.partner',
                        method: 'get_partner_from_ui',
                        args: [doc_type, doc_number],
                    }, {
                        timeout: 7500,
                    })
                    .then(function (result)
                    {
                        $('select#country_customer option:contains("Peru")').attr('selected', true);
                        if (result != undefined && result.detail!="Not found."){
                            if (doc_type == "1"){

                                $('select[name="company_type"] option:contains("individual")').attr('selected', true);
                                contents.find("[name='name']").val(result.name+' '+result.paternal_surname+' '+result.maternal_surname);
                                contents.find('.vat').val("PED"+doc_number);
                                contents.find('.is_validate').val(true);//attr('checked', true);
                                contents.find('.last_update').val(result.last_update);
                                //contents.find("[name='company_type']").val(result.company_type);
                            }else if (doc_type == "6"){
                                $('select[name="company_type"] option:contains("Compañia")').attr('selected', true);
                                contents.find("[name='name']").val(result.name);
                                contents.find('.commercial_name').val(result.commercial_name);
                                contents.find('.legal_name').val(result.legal_name);
                                contents.find("[name='street']").val(result.street);
                                contents.find('.is_validate').val(true);//attr('checked', true);
                                contents.find('.vat').val("PER"+doc_number);
                                contents.find('.last_update').val(result.last_update);
                                contents.find("[name='state']").val(result.state);
                                contents.find("[name='condition']").val(result.condition);
                                //contents.find("[name='company_type']").val(result.company_type);
                            }else if (doc_type == "0"){
                                contents.find('.vat').val("PEO"+doc_number);
                            }else if (doc_type == "4"){
                                contents.find('.vat').val("PEE"+doc_number);
                            }else if (doc_type == "7"){
                                contents.find('.vat').val("CC"+doc_number);
                            }else if (doc_type == "A"){
                                contents.find('.vat').val("PEA"+doc_number);
                            }else if (doc_type == "B"){
                                contents.find('.vat').val("PEB"+doc_number);
                            }else if (doc_type == "C"){
                                contents.find('.vat').val("PEC"+doc_number);
                            }else if (doc_type == "D"){
                                contents.find('.vat').val("PEI"+doc_number);
                            }
                        }
                    }).fail(function (type, error){
                        console.error('Failed to get partner:');
                    });
                }
            }
        }
    },
});
});
