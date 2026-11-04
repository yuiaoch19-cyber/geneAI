import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='外观与主题'
      desc='调整界面字体与浅色 / 深色外观，保存后立即生效。'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
