describe('BIDS Filter Dialog', () => {
  const FIXTURE_FOLDER = '/fake/path/to/dicoms'

  async function openDialog(): Promise<void> {
    await browser.electron.execute((electron, folder) => {
      const win = electron.BrowserWindow.getAllWindows()[0]
      const series = [
        {
          text: 'T1w #1',
          seriesNumber: 11111111,
          seriesInstanceUID: '1.2.3.s1',
          studyInstanceUID: '1.2.3.studyA',
          patientId: 'sub-01',
          subjectId: 'sub-01',
          sessionId: '1.2.3.studyA',
          seriesDescription: 'T1w',
          protocolName: 'MPRAGE',
          modality: 'MR',
          manufacturer: 'Siemens',
          acquisitionTime: '120000',
          images: 176
        },
        {
          text: 'bold #2',
          seriesNumber: 22222222,
          seriesInstanceUID: '1.2.3.s2',
          studyInstanceUID: '1.2.3.studyA',
          patientId: 'sub-01',
          subjectId: 'sub-01',
          sessionId: '1.2.3.studyA',
          seriesDescription: 'bold',
          protocolName: 'EPI_rest',
          modality: 'MR',
          manufacturer: 'Siemens',
          acquisitionTime: '120500',
          images: 300
        },
        {
          text: 'T1w #3',
          seriesNumber: 33333333,
          seriesInstanceUID: '1.2.3.s3',
          studyInstanceUID: '1.2.3.studyB',
          patientId: 'sub-02',
          subjectId: 'sub-02',
          sessionId: '1.2.3.studyB',
          seriesDescription: 'T1w',
          protocolName: 'MPRAGE',
          modality: 'MR',
          manufacturer: 'GE',
          acquisitionTime: '130000',
          images: 176
        },
        {
          text: 'Report #4',
          seriesNumber: 44444444,
          seriesInstanceUID: '1.2.3.s4',
          studyInstanceUID: '1.2.3.studyB',
          patientId: 'sub-02',
          subjectId: 'sub-02',
          sessionId: '1.2.3.studyB',
          seriesDescription: 'Report',
          protocolName: '',
          modality: 'SR',
          manufacturer: 'GE',
          acquisitionTime: '130200',
          images: 1
        }
      ]
      win.webContents.send('dcm2niix:series-list', { folderPath: folder, series })
    }, FIXTURE_FOLDER)
  }

  it('renders the three-panel dialog when a DICOM series list arrives', async () => {
    await openDialog()
    const dialog = await $('[data-testid="bids-filter-dialog"]')
    await dialog.waitForDisplayed({ timeout: 5000 })
    expect(await dialog.isDisplayed()).toBe(true)

    await (await $('[data-testid="facet-panel"]')).waitForDisplayed()
    await (await $('[data-testid="series-panel"]')).waitForDisplayed()
    await (await $('[data-testid="metadata-panel"]')).waitForDisplayed()

    // 4 data rows present (one per series)
    const rows = await $$('[data-testid="series-panel"] tbody tr[data-crc]')
    expect(rows.length).toBe(4)
  })

  it('filters rows when a subject facet is toggled', async () => {
    // Toggle subject "sub-01" — should narrow to the 2 series that belong to sub-01
    const subjectCheckbox = await $(
      '[data-testid="facet-panel"] label[title="sub-01"] input[type="checkbox"]'
    )
    await subjectCheckbox.click()

    await browser.waitUntil(
      async () => {
        const rows = await $$('[data-testid="series-panel"] tbody tr[data-crc]')
        return rows.length === 2
      },
      { timeout: 3000, timeoutMsg: 'Expected rows to filter down to sub-01 series' }
    )

    // Untoggle to restore all rows for subsequent assertions
    await subjectCheckbox.click()
    await browser.waitUntil(
      async () => (await $$('[data-testid="series-panel"] tbody tr[data-crc]')).length === 4,
      { timeout: 3000 }
    )
  })

  it('populates the metadata panel when a row is clicked', async () => {
    const row = await $('[data-testid="series-panel"] tr[data-crc="22222222"]')
    await row.click()
    const meta = await $('[data-testid="metadata-panel"]')
    const text = await meta.getText()
    expect(text).toContain('22222222')
    expect(text).toContain('sub-01')
    expect(text).toContain('bold')
    expect(text).toContain('Siemens')
  })

  it('updates the convert button count when rows are checked', async () => {
    const cb1 = await $(
      '[data-testid="series-panel"] tr[data-crc="11111111"] input[type="checkbox"]'
    )
    await cb1.click()
    const cb2 = await $(
      '[data-testid="series-panel"] tr[data-crc="33333333"] input[type="checkbox"]'
    )
    await cb2.click()

    const convertBtn = await $('[data-testid="convert-selected"]')
    await browser.waitUntil(async () => (await convertBtn.getText()).includes('Convert 2'), {
      timeout: 3000,
      timeoutMsg: 'Expected Convert button to show selected count of 2'
    })
    expect(await convertBtn.isEnabled()).toBe(true)
  })
})
