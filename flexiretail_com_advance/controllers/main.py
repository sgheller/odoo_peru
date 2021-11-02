# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################

import json
import logging
import werkzeug
import werkzeug.exceptions
import werkzeug.utils

from odoo import http, SUPERUSER_ID, _
from odoo.exceptions import AccessError, AccessDenied
from odoo.http import request
from odoo.tools import config
from odoo.tools.translate import _

from odoo.addons.bus.controllers.main import BusController
from odoo.addons.web.controllers.main import Home, ensure_db


_logger = logging.getLogger(__name__)


class Home(Home):

    @http.route('/web/login', type='http', auth="none", sitemap=False)
    def web_login(self, redirect=None, **kw):
        res = super(Home, self).web_login(redirect, **kw)
        if request.params['login_success']:
            uid = request.session.authenticate(request.session.db, request.params['login'],
                                               request.params['password'])
            user = request.env['res.users'].browse([uid])
            if user.login_with_pos_screen:
                session_obj = request.env['pos.session']
                pos_session = session_obj.sudo().search([
                    ('config_id', '=', user.default_pos.id),
                    ('state', '=', 'opened')
                ])
                if pos_session:
                    if pos_session.user_id.id == uid:
                        return http.redirect_with_hash('/pos/web')
                    else:
                        new_error_message = "The given 'POS Config' is been used by someone else. Contact Administrator!"

                        if uid in [SUPERUSER_ID] \
                            or user.has_group('base.group_system'):
                            request.session['new_error_message'] = new_error_message
                            return res
                        else:
                            request.session.uid = False
                            request.params['login_success'] = False

                            values = request.params.copy()
                            try:
                                values['databases'] = http.db_list()
                            except AccessDenied:
                                values['databases'] = None

                            if 'login' not in values and request.session.get('auth_login'):
                                values['login'] = request.session.get('auth_login')

                            if not config['list_db']:
                                values['disable_database_manager'] = True

                            # otherwise no real way to test debug mode in template as ?debug =>
                            # values['debug'] = '' but that's also the fallback value when
                            # missing variables in qweb
                            if 'debug' in values:
                                values['debug'] = True

                            values['error'] = _(new_error_message)

                            response = request.render('web.login', values)
                            response.headers['X-Frame-Options'] = 'DENY'
                            return response
                else:
                    session_id = user.default_pos.open_session_cb()
                    # only in main modules
                    pos_session = session_obj.sudo().search([
                        ('config_id', '=', user.default_pos.id),
                        ('state', '=', 'opening_control')
                    ])
                    if user.default_pos.cash_control:
                        pos_session.write({'opening_balance': True})
                    pos_session.action_pos_session_open()
                    return http.redirect_with_hash('/pos/web')
            else:
                return res
        else:
            return res

    # ideally, this route should be `auth="user"` but that don't work in non-monodb mode.
    @http.route('/web', type='http', auth="none")
    def web_client(self, s_action=None, **kw):
        ensure_db()
        if not request.session.uid:
            return werkzeug.utils.redirect('/web/login', 303)
        if kw.get('redirect'):
            return werkzeug.utils.redirect(kw.get('redirect'), 303)

        request.uid = request.session.uid
        try:
            context = request.env['ir.http'].webclient_rendering_context()
            if request.session.get('new_error_message'):
                tmp_dict = json.loads(context['session_info'])
                tmp_dict['new_error_message'] = request.session.new_error_message

                context['session_info'] = json.dumps(tmp_dict)

            response = request.render('web.webclient_bootstrap', qcontext=context)
            response.headers['X-Frame-Options'] = 'DENY'
            return response
        except AccessError:
            return werkzeug.utils.redirect('/web/login?error=access')


class DataSet(http.Controller):

    @http.route('/web/dataset/get_country', type='http', auth="user")
    def get_country(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        county_code = kw.get('country_code')
        country_obj = request.env['res.country']
        country_id = country_obj.search([('code', '=', county_code)])
        if country_id:
            data = country_id.read()
            data[0]['image'] = False
            return json.dumps(data)
        else:
            return False

    @http.route('/web/dataset/send_pos_ordermail', type='http', auth="user")
    def send_pos_ordermail(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        order_ids = eval(kw.get('order_ids'))
        orders = request.env['pos.order'].browse(order_ids)
        for order in orders:
            if order and order.reserved and order.session_id and order.session_id.config_id.enable_pos_welcome_mail:
                try:
                    template_id = request.env['ir.model.data'].get_object_reference('flexiretail_com_advance',
                                                                                    'email_template_pos_ereceipt_reservation')
                    template_obj = request.env['mail.template'].browse(template_id[1])
                    template_obj.send_mail(order.id, force_send=True, raise_exception=True)
                except Exception as e:
                    _logger.error('Unable to send email for order %s', e)
            if order and order.partner_id.email and order.session_id.config_id.enable_ereceipt and not order.reserved:
                try:
                    template_id = request.env['ir.model.data'].get_object_reference('flexiretail_com_advance',
                                                                                    'email_template_pos_ereceipt')
                    template_obj = request.env['mail.template'].browse(template_id[1])
                    template_obj.send_mail(order.id, force_send=True, raise_exception=True,
                                           email_values={'email_to': order.partner_id.email})
                except Exception as e:
                    _logger.error('Unable to send email for order %s', e)
        return json.dumps([])

    @http.route('/web/dataset/load_products', type='http', auth="user", methods=['POST'], csrf=False)
    def load_products(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        product_ids = eval(kw.get('product_ids'))
        fields = eval(kw.get('fields'))
        stock_location_id = eval(kw.get('stock_location_id'))
        if product_ids and fields:
            records = request.env['product.product'].with_context(
                {'location': stock_location_id, 'compute_child': False}).search_read([('id', 'in', product_ids)],
                                                                                     fields, order='sequence asc')
            template_ids = []
            if records:
                for each_rec in records:
                    template_ids.append(each_rec['product_tmpl_id'][0])
                    new_date = each_rec['write_date']
                    each_rec['write_date'] = new_date.strftime('%Y-%m-%d %H:%M:%S')

                template_fields = fields + ['name', 'display_name', 'product_variant_ids', 'product_variant_count']
                template_ids = list(dict.fromkeys(template_ids))
                product_temp_ids = request.env['product.template'].with_context(
                    {'location': stock_location_id, 'compute_child': False}).search_read([('id', 'in', template_ids)],
                                                                                         template_fields, order='sequence asc')
                for each_temp in product_temp_ids:
                    temp_new_date = each_temp['write_date']
                    each_temp['write_date'] = temp_new_date.strftime('%Y-%m-%d %H:%M:%S')
                return json.dumps({'templates': product_temp_ids, 'product': records})
        return json.dumps([])

    @http.route('/web/dataset/load_cache_with_template', type='http', auth="user", methods=['POST'], csrf=False)
    def get_products_from_cache(self, **kw):
        config = request.env['pos.config'].browse(int(kw.get('config_id')))
        domain = [["sale_ok", "=", True], ["available_in_pos", "=", True]]
        fields = eval(kw.get('fields'))
        cache_for_user = config._get_cache_for_user()
        if cache_for_user:
            cache_records = cache_for_user.get_cache(domain, fields) or []
            return json.dumps(cache_records)
        else:
            pos_cache = request.env['pos.cache']
            pos_cache.create({
                'config_id': config.id,
                'product_domain': str(domain),
                'product_fields': str(fields),
                'compute_user_id': request.env.uid
            })
            new_cache = config._get_cache_for_user()
            return json.dumps(new_cache.get_cache(domain, fields) or [])

    @http.route('/web/dataset/load_products_template', type='http', auth="user", methods=['POST'], csrf=False)
    def load_products_template(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        product_ids = eval(kw.get('product_ids'))
        fields = eval(kw.get('fields'))
        stock_location_id = eval(kw.get('stock_location_id'))
        if product_ids and fields:
            records = request.env['product.template'].with_context(
                {'location': stock_location_id, 'compute_child': False}).search_read([('id', 'in', product_ids)],
                                                                                     fields, order='sequence asc')
            template_ids = []
            if records:
                for each_rec in records:
                    new_date = each_rec['write_date']
                    each_rec['write_date'] = new_date.strftime('%Y-%m-%d %H:%M:%S')
                return json.dumps(records)
        return json.dumps([])

    # Store data to cache
    @http.route('/web/dataset/store_data_to_cache', type='http', auth="user", methods=['POST'], csrf=False)
    def store_data_to_cache(self, **kw):
        cache_data = json.loads(kw.get('cache_data'))
        result = request.env['pos.config'].store_data_to_cache(cache_data, [])
        return json.dumps([])

    @http.route('/web/dataset/load_customers', type='http', auth="user", methods=['POST'], csrf=False)
    def load_customers(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        partner_ids = eval(kw.get('partner_ids'))
        records = []
        fields = []
        if eval(kw.get('fields')):
            fields = eval(kw.get('fields'))
        domain = [('id', 'in', partner_ids), ('customer', '=', True)]
        try:
            records = request.env['res.partner'].search_read(domain, fields)
            if records:
                for each_rec in records:
                    if each_rec['write_date']:
                        client_write_date = each_rec['write_date']
                        each_rec['write_date'] = client_write_date.strftime('%Y-%m-%d %H:%M:%S')
                return json.dumps(records)
        except Exception as e:
            print("\n Error......", e)
        return json.dumps([])

    @http.route('/web/dataset/load_all_pos_order', type='http', auth="user", methods=['POST'], csrf=False)
    def load_all_pos_order(self, **kw):
        cr, uid, context = request.cr, request.uid, request.context
        result_order_ids = eval(kw.get('result_order_ids'))
        records = []
        domain = [('id', 'in', result_order_ids)]
        try:
            records = request.env['pos.order'].search_read(domain)
            if records:
                for each_rec in records:
                    if each_rec.get('date_invoice'):
                        custom_date_invoice = each_rec['date_invoice']
                        each_rec['date_invoice'] = custom_date_invoice.strftime('%Y-%m-%d')
                    if each_rec.get('pe_invoice_date'):
                        pe_invoice_date = each_rec['pe_invoice_date']
                        each_rec['pe_invoice_date'] = pe_invoice_date.strftime('%Y-%m-%d %H:%M:%S')
                    if each_rec['date_order']:
                        custom_date_order = each_rec['date_order']
                        each_rec['date_order'] = custom_date_order.strftime('%Y-%m-%d %H:%M:%S')
                    if each_rec['__last_update']:
                        custom_last_update = each_rec['__last_update']
                        each_rec['__last_update'] = custom_last_update.strftime('%Y-%m-%d %H:%M:%S')
                    if each_rec['create_date']:
                        custom_create_date = each_rec['create_date']
                        each_rec['create_date'] = custom_create_date.strftime('%Y-%m-%d %H:%M:%S')
                    if each_rec['reserve_delivery_date']:
                        custom_create_date = each_rec['reserve_delivery_date']
                        each_rec['reserve_delivery_date'] = custom_create_date.strftime('%Y-%m-%d')
                    if each_rec['write_date']:
                        client_write_date = each_rec['write_date']
                        each_rec['write_date'] = client_write_date.strftime('%Y-%m-%d %H:%M:%S')
                return json.dumps(records)
        except Exception as e:
            print("\n Error......", e)
        return json.dumps([])


class TerminalLockController(BusController):

    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        if options.get('customer.display'):
            channels = list(channels)
            ticket_channel = (
                request.db,
                'customer.display',
                options.get('customer.display')
            )
            channels.append(ticket_channel)
        if options.get('lock.data'):
            channels = list(channels)
            lock_channel = (
                request.db,
                'lock.data',
                options.get('lock.data')
            )
            channels.append(lock_channel)
        if options.get('sale.note'):
            channels = list(channels)
            lock_channel = (
                request.db,
                'sale.note',
                options.get('sale.note')
            )
            channels.append(lock_channel)

        return super(TerminalLockController, self)._poll(dbname, channels, last, options)


class PosMirrorController(http.Controller):

    @http.route('/web/customer_display', type='http', auth='user')
    def white_board_web(self, **k):
        config_id = False
        pos_sessions = request.env['pos.session'].search([
            ('state', '=', 'opened'),
            ('user_id', '=', request.session.uid),
            ('rescue', '=', False)])
        if pos_sessions:
            config_id = pos_sessions.config_id.id
        context = {
            'session_info': json.dumps(request.env['ir.http'].session_info()),
            'config_id': config_id,
        }
        return request.render('flexiretail_com_advance.customer_display_index', qcontext=context)


# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
