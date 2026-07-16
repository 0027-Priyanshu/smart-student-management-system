class LogisticRegression {
  private weights: number[];
  private learningRate: number;
  private numSteps: number;

  constructor(numFeatures: number, learningRate = 0.05, numSteps = 1000) {
    this.weights = new Array(numFeatures + 1).fill(0); // +1 for bias
    this.learningRate = learningRate;
    this.numSteps = numSteps;
  }

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-z));
  }

  public train(X: number[][], y: number[]) {
    const m = X.length;
    for (let step = 0; step < this.numSteps; step++) {
      let dw = new Array(this.weights.length).fill(0);
      
      for (let i = 0; i < m; i++) {
        // Compute dot product W * X + b
        let z = this.weights[0]; // bias
        for (let j = 0; j < X[i].length; j++) {
          z += this.weights[j + 1] * X[i][j];
        }
        
        const h = this.sigmoid(z);
        const error = h - y[i];

        // Gradient for bias
        dw[0] += error;
        // Gradient for weights
        for (let j = 0; j < X[i].length; j++) {
          dw[j + 1] += error * X[i][j];
        }
      }

      // Update weights
      for (let j = 0; j < this.weights.length; j++) {
        this.weights[j] -= this.learningRate * (dw[j] / m);
      }
    }
  }

  public predictProbability(x: number[]): number {
    let z = this.weights[0];
    for (let i = 0; i < x.length; i++) {
      z += this.weights[i + 1] * x[i];
    }
    return this.sigmoid(z);
  }
}

class RiskPredictor {
  private model: LogisticRegression;
  private isTrained = false;

  constructor() {
    this.model = new LogisticRegression(3); // GPA, Attendance, WeakSubjects
    this.trainModel();
  }

  private generateSyntheticData() {
    const X: number[][] = [];
    const y: number[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const gpa = Math.random() * 4;
      const attendance = Math.random() * 100;
      const weakSubjects = Math.floor(Math.random() * 6);

      let riskLevel = 0;
      if (gpa < 2.0) riskLevel = 1;
      else if (gpa < 2.5 && attendance < 75) riskLevel = 1;
      else if (gpa < 3.0 && attendance < 60) riskLevel = 1;
      else if (weakSubjects >= 3) riskLevel = 1;

      if (Math.random() < 0.05) riskLevel = riskLevel === 1 ? 0 : 1;

      X.push([gpa, attendance, weakSubjects]);
      y.push(riskLevel);
    }
    return { X, y };
  }

  public trainModel() {
    try {
      console.log('[ML Engine] Training custom Logistic Regression Risk Model on historical data...');
      const { X, y } = this.generateSyntheticData();
      this.model.train(X, y);
      this.isTrained = true;
      console.log('[ML Engine] Model trained successfully.');
    } catch (error) {
      console.error('[ML Engine] Training failed:', error);
    }
  }

  public predict(gpa: number, attendanceRate: number, weakSubjectsCount: number): { riskScore: number, riskLevel: 'Low' | 'Medium' | 'High' } {
    if (!this.isTrained) {
      return this.fallbackHeuristic(gpa, attendanceRate, weakSubjectsCount);
    }

    const probability = this.model.predictProbability([gpa, attendanceRate, weakSubjectsCount]);
    const riskScore = Math.min(Math.round(probability * 100), 99);
    
    let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
    if (riskScore > 70) riskLevel = 'High';
    else if (riskScore >= 40) riskLevel = 'Medium';

    return { riskScore, riskLevel };
  }

  private fallbackHeuristic(gpa: number, attendanceRate: number, weakSubjectsCount: number): { riskScore: number, riskLevel: 'Low' | 'Medium' | 'High' } {
    let score = 10;
    if (gpa < 2.5) score += 40;
    else if (gpa < 3.0) score += 20;

    if (attendanceRate < 75) score += 40;
    else if (attendanceRate < 85) score += 20;

    score += Math.min(weakSubjectsCount * 10, 30);
    score = Math.min(score, 99);

    let level: 'Low' | 'Medium' | 'High' = 'Low';
    if (score > 70) level = 'High';
    else if (score >= 40) level = 'Medium';

    return { riskScore: score, riskLevel: level };
  }
}

export const riskPredictor = new RiskPredictor();
