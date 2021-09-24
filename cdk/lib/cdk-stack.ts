import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3Deployment from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as route53 from '@aws-cdk/aws-route53';
import * as targets from '@aws-cdk/aws-route53-targets';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const myBucket = new s3.Bucket(this, `earthdata-dashboard-${process.env.PROJECT}-${process.env.STAGE}`, {
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,        
      websiteIndexDocument: "index.html"
    });

    const deployment = new s3Deployment.BucketDeployment(this, "deployStaticWebsite", {
      sources: [s3Deployment.Source.asset("../dist")],
      destinationBucket: myBucket
    });  
    
    const hostedZoneId = `${process.env.AWS_HOSTED_ZONE_ID}`;
    const myZone = route53.HostedZone.fromHostedZoneId(this, 'MyZone', hostedZoneId);
    const subDomain =`earthdata-dashboard.${process.env.AWS_HOSTED_ZONE_NAME}`;
    const certArn = `${process.env.AWS_CERTIFICATE_ARN}`
      
    const myDist = new cloudfront.CloudFrontWebDistribution(this, "MyDist", {
      originConfigs: [{
          s3OriginSource: { s3BucketSource: myBucket},
          behaviors: [{ isDefaultBehavior: true }]
        }],
      aliasConfiguration: {
        acmCertRef: certArn,
        names: [subDomain]
      }
    });

    const aliasRecord = new route53.ARecord(this, 'AliasForCloudFront',{
      zone: myZone,
      recordName: subDomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(myDist)),
    });

  }
}
