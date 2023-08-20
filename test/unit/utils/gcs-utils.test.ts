import {assert, match, restore, spy, stub} from 'sinon'
import * as googleAuthLibraryModule from 'google-auth-library'
import * as storageModule from '@google-cloud/storage'
import {expect} from 'chai'
import {createStorage, getBucket} from '../../../src/utils/gcs-utils'

describe('utils/gcs-utils', () => {
  describe('createStorage', () => {
    afterEach(() => {
      restore()
    })

    it('should work', () => {
      const setCredentials = stub()

      const oauth2Client = stub().callsFake(function (this: any) {
        this.setCredentials = setCredentials
      })
      stub(googleAuthLibraryModule, 'OAuth2Client').value(oauth2Client)

      const storage = stub().callsFake(function (this: any) {
        this.dummy = 'storage-obj'
      })
      stub(storageModule, 'Storage').value(storage)

      const res = createStorage({
        accessToken: 'my-token',
        project: 'my-project',
      }) as any

      expect(res.dummy).to.equal('storage-obj')
      assert.calledOnceWithExactly(oauth2Client, {})

      assert.calledOnceWithExactly(setCredentials, {
        access_token: 'my-token',
      })

      assert.calledOnceWithExactly(storage, {
        authClient: oauth2Client.firstCall.returnValue,
        projectId: 'my-project',
      })
    })
  })

  describe('getBucket', () => {
    afterEach(() => {
      restore()
    })

    it('should create storage if not provided', () => {
      const setCredentials = stub()

      const oauth2Client = stub().callsFake(function (this: any) {
        this.setCredentials = setCredentials
      })
      stub(googleAuthLibraryModule, 'OAuth2Client').value(oauth2Client)

      const bucket = stub().returns('bucket')
      const storage = stub().callsFake(function (this: any) {
        this.dummy = 'storage-obj'
        this.bucket = bucket
      })
      stub(storageModule, 'Storage').value(storage)

      const res = getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: 'my-bucket'}} as any,
        auth: {
          accessToken: 'my-token',
          project: 'my-project',
        },
      })
      assert.calledOnceWithExactly(oauth2Client, {})

      assert.calledOnceWithExactly(setCredentials, {
        access_token: 'my-token',
      })

      assert.calledOnceWithExactly(storage, {
        authClient: oauth2Client.firstCall.returnValue,
        projectId: 'my-project',
      })

      assert.calledOnceWithExactly(bucket, 'my-bucket')
      expect(res.bucket).to.equal(bucket.firstCall.returnValue)
      expect(res.namePrefix).to.equal('')
    })

    it('should use storage obj', () => {
      const bucket = stub().returns('bucket-obj')
      const res = getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: 'my-bucket'}} as any,
        storage: {bucket} as any,
      })
      assert.calledOnceWithExactly(bucket, 'my-bucket')
      expect(res.bucket).to.equal('bucket-obj')
      expect(res.namePrefix).to.equal('')
    })

    it('should support prefix', () => {
      const bucket = stub().returns('bucket-obj')
      const res = getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: 'my-bucket/path/in/backet/'}} as any,
        storage: {bucket} as any,
      })
      assert.calledOnceWithExactly(bucket, 'my-bucket')
      expect(res.bucket).to.equal('bucket-obj')
      expect(res.namePrefix).to.equal('path/in/backet/')
    })

    it('should add trailing slash to prefix', () => {
      const bucket = stub().returns('bucket-obj')
      const res = getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: 'my-bucket/path/in/backet'}} as any,
        storage: {bucket} as any,
      })
      assert.calledOnceWithExactly(bucket, 'my-bucket')
      expect(res.bucket).to.equal('bucket-obj')
      expect(res.namePrefix).to.equal('path/in/backet/')
    })

    it('should add trailing slash after bucket name', () => {
      const bucket = stub().returns('bucket-obj')
      const res = getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: 'my-bucket/'}} as any,
        storage: {bucket} as any,
      })
      assert.calledOnceWithExactly(bucket, 'my-bucket')
      expect(res.bucket).to.equal('bucket-obj')
      expect(res.namePrefix).to.equal('')
    })

    it('should throw error if no GCFF_PATH set', () => {
      const bucket = stub().returns('bucket-obj')
      expect(() => getBucket({
        serviceConfig: {environmentVariables: {}} as any,
        storage: {bucket} as any,
      })).to.throw('No env variable GCFF_PATH for provided cloud function')
    })

    it('should throw error if no env variable provided', () => {
      const bucket = stub().returns('bucket-obj')
      expect(() => getBucket({
        serviceConfig: {} as any,
        storage: {bucket} as any,
      })).to.throw('No env variable GCFF_PATH for provided cloud function')
    })

    it('should throw error if GCFF_PATH is invalid', () => {
      const bucket = stub().returns('bucket-obj')
      expect(() => getBucket({
        serviceConfig: {environmentVariables: {GCFF_PATH: '/'}} as any,
        storage: {bucket} as any,
      })).to.throw('GCFF_PATH set to incorrect value')
    })
  })
})
