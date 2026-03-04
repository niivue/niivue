import { Text } from '@radix-ui/themes'
import type { BidsSeriesMapping, ParticipantDemographics } from '../../../../common/bidsTypes.js'
import { generateBidsFilename } from './bidsTreeUtil.js'

interface StepSubjectSessionProps {
  subject: string
  setSubject: (s: string) => void
  session: string
  setSession: (s: string) => void
  mappings: BidsSeriesMapping[]
  demographics: ParticipantDemographics
  setDemographics: (d: ParticipantDemographics) => void
}

export function StepSubjectSession({
  subject,
  setSubject,
  session,
  setSession,
  mappings,
  demographics,
  setDemographics
}: StepSubjectSessionProps): JSX.Element {
  const included = mappings.filter((m) => !m.excluded)

  // Show a preview of filenames with the current subject/session
  const previewMappings = included.slice(0, 5).map((m) => ({
    ...m,
    subject: subject || '01',
    session
  }))

  const hasAutoDetected = demographics.age !== '' || demographics.sex !== ''

  const updateField = (key: keyof ParticipantDemographics, value: string): void => {
    setDemographics({ ...demographics, [key]: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <Text size="2" weight="bold">Subject & Session</Text>
      <Text size="1" color="gray">
        Set the subject and session labels for this conversion.
      </Text>

      <div className="flex gap-4">
        <label className="flex flex-col gap-1 flex-1">
          <Text size="1" weight="medium">
            Subject ID <span className="text-red-500">*</span>
          </Text>
          <div className="flex items-center gap-1">
            <Text size="1" color="gray">sub-</Text>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder="01"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
            />
          </div>
          <Text size="1" color="gray">Alphanumeric only (e.g., 01, control01, P001)</Text>
        </label>

        <label className="flex flex-col gap-1 flex-1">
          <Text size="1" weight="medium">Session ID (optional)</Text>
          <div className="flex items-center gap-1">
            <Text size="1" color="gray">ses-</Text>
            <input
              type="text"
              value={session}
              onChange={(e) => setSession(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
              placeholder=""
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded"
            />
          </div>
          <Text size="1" color="gray">Leave empty for single-session studies</Text>
        </label>
      </div>

      {/* Demographics */}
      <div className="mt-2">
        <Text size="1" weight="bold" className="block mb-2">
          Participant Demographics
        </Text>
        {hasAutoDetected && (
          <Text size="1" color="blue" className="block mb-2">
            Some fields were auto-detected from DICOM headers.
          </Text>
        )}
        <div className="flex gap-4">
          <label className="flex flex-col gap-1 flex-1">
            <Text size="1" weight="medium">Age (years)</Text>
            <input
              type="text"
              value={demographics.age}
              onChange={(e) => updateField('age', e.target.value.replace(/[^0-9]/g, ''))}
              placeholder=""
              className="px-3 py-2 text-sm border border-gray-300 rounded"
            />
          </label>

          <label className="flex flex-col gap-1 flex-1">
            <Text size="1" weight="medium">Sex</Text>
            <select
              value={demographics.sex}
              onChange={(e) => updateField('sex', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">--</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 flex-1">
            <Text size="1" weight="medium">Handedness</Text>
            <select
              value={demographics.handedness}
              onChange={(e) => updateField('handedness', e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded bg-white"
            >
              <option value="">--</option>
              <option value="left">left</option>
              <option value="right">right</option>
              <option value="ambidextrous">ambidextrous</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 flex-1">
            <Text size="1" weight="medium">Group</Text>
            <input
              type="text"
              value={demographics.group}
              onChange={(e) => updateField('group', e.target.value)}
              placeholder=""
              className="px-3 py-2 text-sm border border-gray-300 rounded"
            />
          </label>
        </div>
      </div>

      {/* Filename preview */}
      <div className="mt-2">
        <Text size="1" weight="medium" className="block mb-1">
          Filename Preview
        </Text>
        <div className="bg-gray-50 rounded border border-gray-200 p-2 text-xs font-mono">
          {previewMappings.map((m, i) => (
            <div key={i} className="py-0.5 text-gray-700">
              {generateBidsFilename(m)}.nii.gz
            </div>
          ))}
          {included.length > 5 && (
            <div className="py-0.5 text-gray-400 italic">...and {included.length - 5} more</div>
          )}
        </div>
      </div>
    </div>
  )
}
