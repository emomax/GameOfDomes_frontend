
#include "Object.h"

class Particle : public Object
{
public:
	Particle()
	{
		initTransform();
	}

	virtual ~Particle() {}

private:
	float radius;
	//texture;
};
