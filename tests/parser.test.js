const assert = require('node:assert');
const test = require('node:test');
const { parseCurriculum, titleFromUrl } = require('../src/parser.js');

test('public course page format', () => {
  const text = `Course content
16 sections • 220 lectures • 14h 57m total length
Expand all sections
Introduction - AWS Certified Cloud Practitioner
3 lectures • 9min
Course Introduction
Preview
03:12
Exam Overview
05:40
Code & Slides Download
00:25
Getting started with AWS
2 lectures • 1hr 2min
Create an AWS Account
12:01
AWS Console Tour
50:10`;
  const s = parseCurriculum(text);
  assert.strictEqual(s.length, 2);
  assert.strictEqual(s[0].title, 'Introduction - AWS Certified Cloud Practitioner');
  assert.deepStrictEqual(s[0].lessons.map((l) => l.title), ['Course Introduction', 'Exam Overview', 'Code & Slides Download']);
  assert.strictEqual(s[0].lessons[0].min, 3);
  assert.strictEqual(s[1].lessons[1].min, 50);
});

test('in-course sidebar format', () => {
  const text = `Section 1: Introduction
3 / 3 | 9min
1. Course Introduction
3min
2. Exam Overview
6min
Section 2: IAM
0 / 2 | 20min
3. IAM Users & Groups
10min
4. IAM Policies
10min`;
  const s = parseCurriculum(text);
  assert.strictEqual(s.length, 2);
  assert.strictEqual(s[1].title, 'IAM');
  assert.strictEqual(s[1].lessons[0].title, 'IAM Users & Groups');
  assert.strictEqual(s[1].lessons[0].min, 10);
});

test('plain list, one lesson per line', () => {
  const s = parseCurriculum('EC2 basics 12:00\nS3 intro\n\nVPC 5 min');
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].lessons.length, 3);
  assert.strictEqual(s[0].lessons[0].min, 12);
  assert.strictEqual(s[0].lessons[2].title, 'VPC');
});

test('title from url', () => {
  assert.strictEqual(titleFromUrl('https://www.udemy.com/course/aws-certified-cloud-practitioner-new/?x=1'), 'AWS Certified Cloud Practitioner New');
});
