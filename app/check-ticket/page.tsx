import { PublicSiteLayout } from '@/components/Marketing/PublicSiteLayout'
import { PublicTicketCheck } from '@/components/Marketing/PublicTicketCheck'

export default function CheckTicketPage() {
  return (
    <PublicSiteLayout>
      <PublicTicketCheck layout="page" inputId="sale-code-page" />
    </PublicSiteLayout>
  )
}
