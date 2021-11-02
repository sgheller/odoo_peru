# -*- coding: utf-8 -*-
# Copyright 2020-now Al Hadi Tech - Pakistan
# License OPL-1

import base64
from odoo import models, fields, api, _

class InheritedResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    eye_examination_chargeable = fields.Boolean(config_parameter='optical_erp.eye_examination')

    @api.model
    def get_values(self):
        res = super(InheritedResConfigSettings,self).get_values()
        params = self.env['ir.config_parameter'].sudo()
        eye_examination_chargeable = params.get_param('eye_examination_chargeable')
        res.update(
            eye_examination_chargeable=eye_examination_chargeable,
        )
        return res


    def set_values(self):
        super(InheritedResConfigSettings,self).set_values()
        self.env['ir.config_parameter'].sudo().set_param("eye_examination_chargeable",self.eye_examination_chargeable)


























