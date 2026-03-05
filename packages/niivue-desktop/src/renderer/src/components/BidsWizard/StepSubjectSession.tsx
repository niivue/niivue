import { Text } from '@radix-ui/themes'
import type { BidsSeriesMapping, ParticipantDemographics, DetectedSubject } from '../../../../common/bidsTypes.js'
import { generateBidsFilename } from './bidsTreeUtil.js'

interface StepSubjectSessionProps {
  subject: string
  setSubject: (s: string) => void
  session: string
  setSession: (s: string) => void
  mappings: BidsSeriesMapping[]
  demographics: ParticipantDemographics
  setDemographics: (d: ParticipantDemographics) => void
  detectedSubjects: DetectedSubject[]
  onUpdateDetectedSubject: (index: number, changes: Partial<DetectedSubject>) => void
  onUpdateDetectedSubjectDemographics: (index: number, field: keyof ParticipantDemographics, value: string) => void
  onUpdateDetectedSessionLabel: (subjectIndex: number, sessionIndex: number, label: string) => void
}

export function StepSubjectSession({
  subject,
  setSubject,
  session,
  setSession,
  mappings,
  demographics,
  setDemographics,
  detectedSubjects,
  onUpdateDetectedSubject,
  onUpdateDetectedSubjectDemographics,
  onUpdateDetectedSessionLabel
}: StepSubjectSessionProps): JSX.Element {
  const included = mappings.filter((m) => !m.excluded)
  const isMultiSubject = detectedSubjects.length > 1

  const updateField = (key: keyof ParticipantDemographics, value: string): void => {
    setDemographics({ ...demographics, [key]: value })
  }

  if (isMultiSubject) {
    return (
      <div className="flex flex-col gap-4">
        <Text size="2" weight="bold">Subjects & Sessions (Multi-Subject)</Text>
        <Text size="1" color="gray">
          {detectedSubjects.length} subjects detected from DICOM headers. Edit labels and demographics below.
        </Text>

        <div className="overflow-auto max-h-[350px] border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="py-1.5 px-2 text-left font-medium">Patient ID</th>
                <th className="py-1.5 px-2 text-left font-medium">Subject</th>
                <th className="py-1.5 px-2 text-left font-medium">Sessions</th>
                <th className="py-1.5 px-2 text-left font-medium">Age</th>
                <th className="py-1.5 px-2 text-left font-medium">Sex</th>
                <th className="py-1.5 px-2 text-left font-medium">Hand.</th>
                <th className="py-1.5 px-2 text-left font-medium">Series</th>
              </tr>
            </thead>
            <tbody>
              {detectedSubjects.map((ds, si) => {
                const totalSeries = ds.sessions.reduce((sum, s) => sum + s.seriesIndices.length, 0)
                return (
                  <tr key={si} className="border-t border-gray-100">
                    <td className="py-1.5 px-2">
                      <Text size="1" className="block truncate max-w-[120px]" title={ds.rawId}>
                        {ds.rawId}
                      </Text>
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-0.5">
                        <Text size="1" color="gray">sub-</Text>
                        <input
                          type="text"
                          value={ds.label}
                          onChange={(e) => onUpdateDetectedSubject(si, { label: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                          className="w-14 px-1 py-0.5 text-xs border border-gray-300 rounded"
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      {ds.sessions.length <= 1 ? (
                        <Text size="1" color="gray">-</Text>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {ds.sessions.map((ses, sei) => (
                            <div key={sei} className="flex items-center gap-0.5">
                              <Text size="1" color="gray">ses-</Text>
                              <input
                                type="text"
                                value={ses.label}
                                onChange={(e) => onUpdateDetectedSessionLabel(si, sei, e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                                className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded"
                              />
                              <Text size="1" color="gray">({ses.seriesIndices.length})</Text>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={ds.demographics.age}
                        onChange={(e) => onUpdateDetectedSubjectDemographics(si, 'age', e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-10 px-1 py-0.5 text-xs border border-gray-300 rounded"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={ds.demographics.sex}
                        onChange={(e) => onUpdateDetectedSubjectDemographics(si, 'sex', e.target.value)}
                        className="px-1 py-0.5 text-xs border border-gray-300 rounded bg-white"
                      >
                        <option value="">--</option>
                        <option value="male">M</option>
                        <option value="female">F</option>
                        <option value="other">O</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={ds.demographics.handedness}
                        onChange={(e) => onUpdateDetectedSubjectDemographics(si, 'handedness', e.target.value)}
                        className="px-1 py-0.5 text-xs border border-gray-300 rounded bg-white"
                      >
                        <option value="">--</option>
                        <option value="left">L</option>
                        <option value="right">R</option>
                        <option value="ambidextrous">A</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <Text size="1">{totalSeries}</Text>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // Single subject UI (original)
  const previewMappings = included.slice(0, 5).map((m) => ({
    ...m,
    subject: subject || '01',
    session
  }))

  const hasAutoDetected = demographics.age !== '' || demographics.sex !== ''

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
