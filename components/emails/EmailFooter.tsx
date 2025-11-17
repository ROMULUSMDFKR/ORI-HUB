import React from 'react';

const year = new Date().getFullYear();

export const emailFooterHtml = `
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
    <tbody>
      <tr>
        <td align="center" style="font-family: Arial, sans-serif; font-size: 12px; color: #64748b; line-height: 1.5;">
          <p style="margin: 0 0 8px 0;"><strong>CRM Studio Inc.</strong></p>
          <p style="margin: 0;">123 Business Rd, Suite 456, Mexico City, 01000</p>
          <p style="margin: 16px 0;">
            <a href="#" style="color: #4f46e5; text-decoration: none;">Darse de baja</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="#" style="color: #4f46e5; text-decoration: none;">Términos y Condiciones</a>
            &nbsp;&nbsp;·&nbsp;&nbsp;
            <a href="#" style="color: #4f46e5; text-decoration: none;">Política de Privacidad</a>
          </p>
          <p style="margin: 0;">
            © ${year} CRM Studio Inc. Todos los derechos reservados.
          </p>
        </td>
      </tr>
    </tbody>
  </table>
`;

const EmailFooter: React.FC = () => {
    return (
        <div dangerouslySetInnerHTML={{ __html: emailFooterHtml }} />
    );
};

export default EmailFooter;
