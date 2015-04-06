#include "skybox.h"

#include "Object.h"

void Object::initTransform()
{
	transform = new osg::MatrixTransform();
	transform->setMatrix(osg::Matrix::identity());
}