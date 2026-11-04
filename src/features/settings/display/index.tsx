import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='本地工作区'
      desc='了解数据存放位置、计算口径与本地服务信息。'
    >
      <DisplayForm />
    </ContentSection>
  )
}
