from odoo import api, fields, models,_

class InheritedDoctor(models.Model):
    _inherit = 'optical.dr'

    prescription_count = fields.Integer(compute='get_prescription_count')


    def open_doctor_prescriptions(self):
        for records in self:
            return {
                'name':_('Doctor Prescription'),
                'view_type': 'form',
                'domain': [('dr', '=',records.id)],
                'res_model': 'dr.prescription',
                'view_id': False,
                'view_mode':'tree,form',
                'context':{'default_dr':self.id},
                'type': 'ir.actions.act_window',
            }

    def get_prescription_count(self):
        for records in self:
            count = self.env['dr.prescription'].search_count([('dr','=',records.id)])
            records.prescription_count = count



