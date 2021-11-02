# -*- coding: utf-8 -*-

import logging
import psycopg2
import pytz
import time

from datetime import datetime, date, time, timedelta
from dateutil.relativedelta import relativedelta
from operator import itemgetter
from pytz import timezone
from timeit import itertools

from odoo import models, fields, api, tools, _, SUPERUSER_ID
from odoo.exceptions import UserError, ValidationError, Warning
from odoo.tools import float_is_zero, DEFAULT_SERVER_DATETIME_FORMAT

_logger = logging.getLogger(__name__)


class PosOrder(models.Model):
    _inherit = 'pos.order'

    #number_cotization = fields.Char(string=u'Número de cotización')
    #is_cotization = fields.Boolean(default=False)

    # TODO: Realizar Pago
    def pay_order(self, pay_amount, session_id, journal_id):

        if pay_amount == 0:
            raise UserError(_('No puede pagar con monto en cero! '))

        if journal_id in (False, ""):
            raise UserError(_('Seleccione por favor un método de pago! '))

        if self.amount_due < pay_amount:
            raise UserError(_('El monto a pagar no puede ser mayor al monto adeudado ! '))

        self.add_payment({
            'amount': pay_amount,
            'payment_date': fields.Date.context_today(self),
            'payment_name': 'Completando pago parcial',
            'journal': journal_id,
            'pos_session_id': session_id
        })

        #si el pago es total, entonces confirmo la factura
        # if self.amount_paid == self.amount_total and self.invoice_id:
        #     self.invoice_id.sudo().action_invoice_open()
        #     self.account_move = self.invoice_id.move_id

        if self.session_id.id != session_id:
            SESSION = self.env['pos.session'].browse(session_id)
            SESSION.write({'order_other_ids': [(4, self.id)]})

        return True




    def _prepare_bank_statement_line_payment_values(self, data):
        """Create a new payment for the order"""
        args = {
            'amount': data['amount'],
            'date': data.get('payment_date', fields.Date.context_today(self)),
            'name': self.name + ': ' + (data.get('payment_name', '') or ''),
            'partner_id': self.env["res.partner"]._find_accounting_partner(self.partner_id).id or False,
        }

        journal_id = data.get('journal', False)
        statement_id = data.get('statement_id', False)
        assert journal_id or statement_id, "No statement_id or journal_id passed to the method!"

        journal = self.env['account.journal'].browse(journal_id)
        # use the company of the journal and not of the current user
        company_cxt = dict(self.env.context, force_company=journal.company_id.id)
        account_def = self.env['ir.property'].with_context(company_cxt).get('property_account_receivable_id', 'res.partner')
        args['account_id'] = (self.partner_id.property_account_receivable_id.id) or (account_def and account_def.id) or False

        if not args['account_id']:
            if not args['partner_id']:
                msg = _('There is no receivable account defined to make payment.')
            else:
                msg = _('There is no receivable account defined to make payment for the partner: "%s" (id:%d).') % (
                    self.partner_id.name, self.partner_id.id,)
            raise UserError(msg)

        context = dict(self.env.context)
        context.pop('pos_session_id', False)

        if 'pos_session_id' in data:
            if self.session_id.id != data['pos_session_id']:
                SESSION = self.env['pos.session'].browse(data['pos_session_id'])
                for statement in SESSION.statement_ids:
                    if statement.journal_id.id == data['journal']:
                        journal_id = data['journal']
                        statement_id = statement.id
                        break

            ref = SESSION.name

        else:

            for statement in self.session_id.statement_ids:
                if statement.id == statement_id:
                    journal_id = statement.journal_id.id
                    break
                elif statement.journal_id.id == journal_id:
                    statement_id = statement.id
                    break

            ref = self.session_id.name
        if not statement_id:
            raise UserError(_('You have to open at least one cashbox.'))

        args.update({
            'statement_id': statement_id,
            'pos_statement_id': self.id,
            'journal_id': journal_id,
            'ref': ref,
        })


        return args


class PosSession(models.Model):
    _inherit = 'pos.session'

    order_other_ids = fields.Many2many('pos.order','pos_session_order_other_id','session_id','order_id')